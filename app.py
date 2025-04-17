import os
from flask import Flask, render_template, request, redirect, url_for, send_file
from werkzeug.utils import secure_filename
from PyPDF2 import PdfMerger
import tempfile
import shutil

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/merge', methods=['POST'])
def merge_pdfs():
    # Check if files were uploaded
    if 'files' not in request.files:
        return redirect(url_for('index', error="No files were submitted"))
    
    files = request.files.getlist('files')
    
    # Check if any file was selected
    if not files or files[0].filename == '':
        return redirect(url_for('index', error="No files selected"))
    
    # Validate file types
    for file in files:
        if not allowed_file(file.filename):
            return redirect(url_for('index', error="Only PDF files are allowed"))
    
    # Create a temporary directory to store uploaded files
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save uploaded files to the temporary directory
        file_paths = []
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(temp_dir, filename)
                file.save(file_path)
                file_paths.append(file_path)
        
        # Check if any valid files were saved
        if not file_paths:
            return redirect(url_for('index', error="No valid PDF files were found"))
            
        # Merge PDFs
        merger = PdfMerger()
        for file_path in file_paths:
            merger.append(file_path)
        
        # Save the merged PDF to a temporary file
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'merged_document.pdf')
        merger.write(output_path)
        merger.close()
        
        # Return the merged PDF
        return send_file(output_path, as_attachment=True, download_name='merged_document.pdf')
    
    except Exception as e:
        # Clean up and return error message
        shutil.rmtree(temp_dir)
        return redirect(url_for('index', error=f"Error: {str(e)}"))
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

if __name__ == '__main__':
    app.run(debug=True) 