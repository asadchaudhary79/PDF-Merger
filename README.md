# PDF Merger

A modern web application built with Flask for merging multiple PDF files into a single document.

## Features

- Clean, modern UI with responsive design
- Drag and drop functionality for easy file uploading
- Multiple PDF selection
- File validation to ensure only PDFs are processed
- Instant download of the merged document
- Add files incrementally with "Add More Files" button
- File preview functionality
- Drag and drop reordering of files before merging
- Page numbering option for merged PDFs
- Dark mode support
- Better error handling and success feedback

## Prerequisites

- Python 3.6 or higher
- pip (Python package manager)

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/pdf-merger.git
   cd pdf-merger
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the Flask development server:

   ```
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000/
   ```

## Usage

1. Upload PDF files by:

   - Dragging and dropping files onto the upload area
   - Clicking the upload area and selecting files through the file dialog

2. Review and organize your files:

   - Preview file contents by clicking the eye icon
   - Remove unwanted files with the trash icon
   - Reorder files by dragging them up or down
   - Add more files using the "Add More Files" button
   - Enable page numbering with the checkbox if desired
   - Rotate pages using the rotate button (clockwise 90°)
   - Split multi-page PDFs into individual pages with the split button

3. Click the "Merge PDFs" button to process the files

4. The merged PDF will be downloaded automatically

## Technologies Used

- **Backend**: Python, Flask
- **PDF Processing**: PyPDF2, ReportLab (for page numbering)
- **Frontend**: HTML5, CSS3, JavaScript
- **UI Components**: SortableJS (for drag-and-drop reordering)
- **Icons**: Font Awesome

## Project Structure

```
pdf-merger/
│
├── app.py                # Main Flask application
├── requirements.txt      # Python dependencies
├── static/               # Static files
│   ├── css/
│   │   └── styles.css    # CSS styles
│   └── js/
│       └── script.js     # JavaScript for interactive features
├── templates/
│   └── index.html        # Main HTML template
└── uploads/              # Directory for storing uploaded files
```

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
