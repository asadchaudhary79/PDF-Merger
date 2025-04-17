document.addEventListener('DOMContentLoaded', function () {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');
    const fileList = document.getElementById('file-list');
    const fileListContainer = document.getElementById('file-list-container');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    // Handle file input change
    fileInput.addEventListener('change', handleFiles, false);

    // Only trigger file input when clicking the label, not the entire drop area
    dropArea.addEventListener('click', function (e) {
        // Only trigger file input when clicking the label or upload icon
        const isLabel = e.target === fileLabel || fileLabel.contains(e.target);
        const isIcon = e.target.closest('.upload-icon') !== null;
        const isDragText = e.target.closest('.drag-text') !== null;

        if ((isLabel || isIcon || isDragText) && e.target !== fileInput) {
            e.preventDefault();
            fileInput.click();
        }
    });

    // Prevent the click event from being triggered on the file input itself
    fileInput.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        handleFiles({ target: { files: files } });
    }

    function handleFiles(e) {
        const files = e.target.files;

        if (files.length > 0) {
            fileListContainer.classList.remove('hidden');
            updateFileList(files);
            // Remove required attribute after files are selected
            fileInput.removeAttribute('required');
        }
    }

    function updateFileList(files) {
        fileList.innerHTML = '';

        console.log(`Number of files selected: ${files.length}`);

        Array.from(files).forEach((file, index) => {
            const fileSize = formatFileSize(file.size);
            const fileItem = document.createElement('li');

            const fileName = document.createElement('span');
            fileName.textContent = file.name;

            const fileInfo = document.createElement('span');
            fileInfo.textContent = fileSize;
            fileInfo.classList.add('file-size');

            fileItem.appendChild(fileName);
            fileItem.appendChild(fileInfo);

            fileList.appendChild(fileItem);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 