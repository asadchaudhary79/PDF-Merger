import os
import uuid
import json
from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, session
from werkzeug.utils import secure_filename
from PyPDF2 import PdfMerger, PdfReader, PdfWriter
import tempfile
import shutil
import io

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/', methods=['GET'])
def index():
    # Clear any previous session data
    if 'uploaded_files' in session:
        session.pop('uploaded_files')
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    # Check if files were uploaded
    if 'files' not in request.files:
        return jsonify({'error': 'No files were submitted'}), 400
    
    files = request.files.getlist('files')
    
    # Check if any file was selected
    if not files or files[0].filename == '':
        return jsonify({'error': 'No files selected'}), 400
    
    # Check if we're adding to an existing session
    session_id = None
    if 'session_id' in request.form:
        session_id = request.form.get('session_id')
    
    # If no session_id in form but one exists in the session, use that
    elif 'uploaded_files' in session:
        session_id = session['uploaded_files'].get('session_id')
    
    # If still no session_id, create a new one
    if not session_id:
        session_id = str(uuid.uuid4())
    
    upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Get existing file info if this is an existing session
    file_info = []
    next_id = 0
    
    if 'uploaded_files' in session and session['uploaded_files'].get('session_id') == session_id:
        file_info = session['uploaded_files']['files'].copy()  # Make a copy to avoid reference issues
        # Find the highest ID to continue from there
        if file_info:
            next_id = max(f['id'] for f in file_info) + 1
    
    # Store uploaded files
    new_files = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add index to ensure unique filenames
            file_path = os.path.join(upload_dir, f"{next_id}_{filename}")
            file.save(file_path)
            
            # Get PDF info
            try:
                with open(file_path, 'rb') as f:
                    pdf = PdfReader(f)
                    num_pages = len(pdf.pages)
                
                new_file = {
                    'id': next_id,
                    'name': filename,
                    'path': file_path,
                    'pages': num_pages
                }
                file_info.append(new_file)
                new_files.append(new_file)
                next_id += 1
            except Exception as e:
                # If there's an error reading the PDF, remove it and continue
                os.remove(file_path)
                print(f"Error reading PDF {filename}: {str(e)}")
                continue
    
    if not new_files:
        return jsonify({'error': 'No valid PDF files were found'}), 400
    
    # Store file info in session
    session['uploaded_files'] = {
        'session_id': session_id,
        'files': file_info
    }
    
    return jsonify({
        'success': True,
        'files': [{'id': f['id'], 'name': f['name'], 'pages': f['pages']} for f in new_files],
        'all_files': [{'id': f['id'], 'name': f['name'], 'pages': f['pages']} for f in file_info],
        'session_id': session_id
    })

@app.route('/preview/<session_id>/<int:file_id>', methods=['GET'])
def preview_file(session_id, file_id):
    if 'uploaded_files' not in session or session['uploaded_files']['session_id'] != session_id:
        return jsonify({'error': 'Session expired or invalid'}), 404
    
    file_info = session['uploaded_files']['files']
    file_to_preview = next((f for f in file_info if f['id'] == file_id), None)
    
    if not file_to_preview:
        return jsonify({'error': 'File not found'}), 404
    
    # Return the first page as preview
    try:
        with open(file_to_preview['path'], 'rb') as f:
            pdf = PdfReader(f)
            if len(pdf.pages) > 0:
                output = PdfWriter()
                output.add_page(pdf.pages[0])
                
                preview_bytes = io.BytesIO()
                output.write(preview_bytes)
                preview_bytes.seek(0)
                
                return send_file(
                    preview_bytes,
                    mimetype='application/pdf',
                    as_attachment=False,
                    download_name=f"preview_{file_to_preview['name']}"
                )
    except Exception as e:
        return jsonify({'error': f'Error generating preview: {str(e)}'}), 500

@app.route('/merge', methods=['POST'])
def merge_pdfs():
    # Get merge options from request
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'files' not in data:
        return jsonify({'error': 'No files specified for merging'}), 400
    
    file_order = data.get('files', [])
    add_page_numbers = data.get('addPageNumbers', False)
    
    if 'uploaded_files' not in session:
        return jsonify({'error': 'No files uploaded'}), 400
    
    uploaded_files = session['uploaded_files']
    file_info = uploaded_files['files']
    
    # Map ordered files to actual file paths
    files_to_merge = []
    for file_id in file_order:
        file_match = next((f for f in file_info if f['id'] == file_id), None)
        if file_match:
            files_to_merge.append(file_match['path'])
    
    if not files_to_merge:
        return jsonify({'error': 'No valid files to merge'}), 400
    
    try:
        # Create output PDF
        merger = PdfMerger()
        for file_path in files_to_merge:
            merger.append(file_path)
        
        # Save the merged PDF to a temporary file
        output_pdf = os.path.join(app.config['UPLOAD_FOLDER'], 'merged_document.pdf')
        merger.write(output_pdf)
        merger.close()
        
        # Add page numbers if requested
        if add_page_numbers:
            page_numbers_added = add_page_numbers_to_pdf(output_pdf)
            if not page_numbers_added:
                print("Page numbers could not be added.")
        
        # Return the merged PDF
        return send_file(
            output_pdf,
            as_attachment=True,
            download_name='merged_document.pdf'
        )
    except Exception as e:
        # Clean up and return error message
        return jsonify({'error': f'Error merging PDFs: {str(e)}'}), 500
    finally:
        # Clean up uploaded files
        if 'uploaded_files' in session:
            session_id = session['uploaded_files']['session_id']
            upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
            if os.path.exists(upload_dir):
                shutil.rmtree(upload_dir)
            session.pop('uploaded_files')

def add_page_numbers_to_pdf(pdf_path):
    """Add page numbers to the merged PDF"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from PyPDF2 import PdfReader, PdfWriter
        import io
        
        # Read the PDF
        reader = PdfReader(pdf_path)
        writer = PdfWriter()
        
        # Add page number to each page
        for i, page in enumerate(reader.pages):
            packet = io.BytesIO()
            # Create a canvas to draw on
            c = canvas.Canvas(packet)
            # Set font and size
            c.setFont("Helvetica", 9)
            # Add page number at the bottom center
            c.drawString(300, 30, f"Page {i+1} of {len(reader.pages)}")
            c.save()
            
            # Move to the beginning of the BytesIO buffer
            packet.seek(0)
            overlay = PdfReader(packet)
            
            # Merge the original page with the page number overlay
            page.merge_page(overlay.pages[0])
            writer.add_page(page)
        
        # Write the result back to the original file
        with open(pdf_path, "wb") as output_file:
            writer.write(output_file)
        return True
    except ImportError:
        print("Warning: reportlab module not found. Page numbers will not be added.")
        return False
    except Exception as e:
        print(f"Error adding page numbers: {str(e)}")
        return False

@app.route('/preferences', methods=['POST'])
def save_preferences():
    """Save user preferences like dark mode"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    dark_mode = data.get('darkMode', False)
    session['dark_mode'] = dark_mode
    
    return jsonify({'success': True})

@app.route('/preferences', methods=['GET'])
def get_preferences():
    """Get user preferences"""
    dark_mode = session.get('dark_mode', False)
    
    return jsonify({
        'darkMode': dark_mode
    })

if __name__ == '__main__':
    app.run(debug=True) 