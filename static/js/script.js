document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');
    const addMoreFilesInput = document.getElementById('add-more-files');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const backButton = document.getElementById('back-button');
    const mergeButton = document.getElementById('merge-button');
    const addPageNumbers = document.getElementById('add-page-numbers');
    const sortableFilesList = document.getElementById('sortable-files');
    const previewContainer = document.getElementById('preview-container');
    const pdfPreview = document.getElementById('pdf-preview');
    const loadingOverlay = document.getElementById('loading-overlay');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const alertContainer = document.getElementById('alert-container');

    // State variables
    let uploadedFiles = [];
    let sessionId = null;
    let sortableList = null;

    // Initialize the app
    init();

    function init() {
        // Initialize drag and drop
        initDragAndDrop();

        // Initialize file input
        fileInput.addEventListener('change', handleFileInputChange);

        // Initialize add more files functionality
        addMoreFilesInput.addEventListener('change', handleAddMoreFiles);

        // Initialize sortable list
        initSortable();

        // Initialize button handlers
        backButton.addEventListener('click', goToStep1);
        mergeButton.addEventListener('click', mergePDFs);

        // Initialize dark mode from preferences
        loadDarkModePreference();
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    function initDragAndDrop() {
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

        // Only trigger file input when clicking the label or specific elements
        dropArea.addEventListener('click', function (e) {
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
    }

    function initSortable() {
        // Initialize SortableJS
        sortableList = new Sortable(sortableFilesList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.sortable-item',
            onEnd: function () {
                // Update the ordering of files after drag ends
                const items = sortableFilesList.querySelectorAll('.sortable-item');
                const newOrder = Array.from(items).map(item => parseInt(item.dataset.id));
                // You can use this order when sending to the server
                console.log('New file order:', newOrder);
            }
        });
    }

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

        if (files.length > 0) {
            handleFiles(files);
        }
    }

    function handleFileInputChange(e) {
        const files = e.target.files;

        if (files.length > 0) {
            handleFiles(files);
        }
    }

    function handleAddMoreFiles(e) {
        const files = e.target.files;

        if (files.length > 0) {
            uploadAdditionalFiles(files);
            // Reset the input so the same file can be selected again if needed
            e.target.value = '';
        }
    }

    function handleFiles(files) {
        showLoading();

        // Create FormData object for AJAX upload
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        // Upload files via AJAX
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                hideLoading();

                if (data.error) {
                    showAlert(data.error, 'error');
                    return;
                }

                // Store uploaded files information
                if (data.all_files) {
                    uploadedFiles = data.all_files;
                } else {
                    uploadedFiles = data.files;
                }

                sessionId = data.session_id;

                // Display files and go to step 2
                displayFiles();
                goToStep2();
            })
            .catch(error => {
                hideLoading();
                showAlert('Error uploading files: ' + error.message, 'error');
            });
    }

    function uploadAdditionalFiles(files) {
        showLoading();

        // Create FormData object for AJAX upload
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        // Use the same session ID if it exists
        if (sessionId) {
            formData.append('session_id', sessionId);
        }

        // Upload files via AJAX
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                hideLoading();

                if (data.error) {
                    showAlert(data.error, 'error');
                    return;
                }

                // Update with all files from server
                if (data.all_files) {
                    uploadedFiles = data.all_files;
                } else {
                    // Add new files to existing ones
                    const newFiles = data.files;

                    // If this is a new session, update the session ID
                    if (data.session_id && (!sessionId || sessionId !== data.session_id)) {
                        sessionId = data.session_id;
                    }

                    // Add new files to our array, avoiding duplicates by ID
                    for (const newFile of newFiles) {
                        // Check if file already exists
                        const exists = uploadedFiles.some(file => file.id === newFile.id);
                        if (!exists) {
                            uploadedFiles.push(newFile);
                        }
                    }
                }

                // Update the display
                displayFiles();
                showAlert(`Added ${data.files.length} file(s) successfully`, 'success');
            })
            .catch(error => {
                hideLoading();
                showAlert('Error uploading additional files: ' + error.message, 'error');
            });
    }

    function displayFiles() {
        // Clear the list
        sortableFilesList.innerHTML = '';

        // Add each file to the sortable list
        uploadedFiles.forEach(file => {
            const listItem = document.createElement('li');
            listItem.className = 'sortable-item';
            listItem.dataset.id = file.id;

            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';

            const fileIcon = document.createElement('i');
            fileIcon.className = 'fas fa-file-pdf file-icon';

            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            const filePages = document.createElement('span');
            filePages.className = 'file-pages';
            filePages.textContent = `${file.pages} page${file.pages !== 1 ? 's' : ''}`;

            fileDetails.appendChild(fileIcon);
            fileDetails.appendChild(fileName);
            fileDetails.appendChild(filePages);

            const fileActions = document.createElement('div');
            fileActions.className = 'file-actions';

            const previewBtn = document.createElement('button');
            previewBtn.className = 'preview-btn';
            previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
            previewBtn.title = 'Preview';
            previewBtn.addEventListener('click', function () {
                showPreview(file.id);
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', function () {
                removeFile(file.id);
            });

            fileActions.appendChild(previewBtn);
            fileActions.appendChild(removeBtn);

            listItem.appendChild(fileDetails);
            listItem.appendChild(fileActions);

            sortableFilesList.appendChild(listItem);
        });

        // Update merge button state
        updateMergeButtonState();
    }

    function showPreview(fileId) {
        if (!sessionId) return;

        // Show preview container
        previewContainer.classList.remove('hidden');

        // Set the preview iframe source
        pdfPreview.src = `/preview/${sessionId}/${fileId}`;
    }

    function removeFile(fileId) {
        // Remove file from the array
        uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);

        // Remove the item from the DOM
        const item = document.querySelector(`.sortable-item[data-id="${fileId}"]`);
        if (item) {
            item.remove();
        }

        // Hide preview if it's showing the removed file
        if (pdfPreview.src.includes(`/preview/${sessionId}/${fileId}`)) {
            previewContainer.classList.add('hidden');
            pdfPreview.src = '';
        }

        // Update merge button state
        updateMergeButtonState();

        // If no files left, go back to step 1
        if (uploadedFiles.length === 0) {
            goToStep1();
        }
    }

    function updateMergeButtonState() {
        // Disable merge button if no files to merge
        mergeButton.disabled = uploadedFiles.length < 1;
    }

    function goToStep1() {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        // Clear preview
        previewContainer.classList.add('hidden');
        pdfPreview.src = '';
    }

    function goToStep2() {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    }

    function mergePDFs() {
        if (uploadedFiles.length === 0) {
            showAlert('No files to merge', 'error');
            return;
        }

        showLoading();

        // Get the current order of files from the DOM
        const items = sortableFilesList.querySelectorAll('.sortable-item');
        const fileOrder = Array.from(items).map(item => parseInt(item.dataset.id));

        // Prepare merge options
        const mergeOptions = {
            files: fileOrder,
            addPageNumbers: addPageNumbers.checked
        };

        // Send merge request
        fetch('/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mergeOptions)
        })
            .then(response => {
                if (!response.ok) {
                    // Try to get error message from JSON response
                    return response.json()
                        .then(data => {
                            throw new Error(data.error || 'Error merging PDFs');
                        })
                        .catch(err => {
                            // If we can't parse JSON, use the status text
                            if (err instanceof SyntaxError) {
                                throw new Error(`Error (${response.status}): ${response.statusText}`);
                            }
                            throw err;
                        });
                }

                // If response is OK, return the blob for download
                return response.blob();
            })
            .then(blob => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'merged_document.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                // Show success message and reset
                hideLoading();
                showAlert('PDFs merged successfully!', 'success');
                setTimeout(() => {
                    // Reset the form and go back to step 1
                    resetForm();
                }, 2000);
            })
            .catch(error => {
                hideLoading();
                // Show error message
                let errorMsg = error.message || 'Unknown error occurred';
                if (errorMsg.includes('reportlab')) {
                    errorMsg = 'Error adding page numbers. The reportlab module is not installed.';
                }
                showAlert(errorMsg, 'error');
            });
    }

    function resetForm() {
        // Clear files
        uploadedFiles = [];
        sessionId = null;
        fileInput.value = '';
        addMoreFilesInput.value = '';

        // Clear preview
        previewContainer.classList.add('hidden');
        pdfPreview.src = '';

        // Go back to step 1
        goToStep1();
    }

    function showAlert(message, type) {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;

        const icon = document.createElement('i');
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';

        const text = document.createTextNode(message);

        alert.appendChild(icon);
        alert.appendChild(text);

        // Add to container
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    function toggleDarkMode() {
        const html = document.documentElement;
        const isDarkMode = html.classList.contains('dark-mode');

        if (isDarkMode) {
            html.classList.remove('dark-mode');
            html.classList.add('light-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i><span class="toggle-text">Dark Mode</span>';
        } else {
            html.classList.remove('light-mode');
            html.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i><span class="toggle-text">Light Mode</span>';
        }

        // Save preference
        saveDarkModePreference(!isDarkMode);
    }

    function loadDarkModePreference() {
        fetch('/preferences')
            .then(response => response.json())
            .then(data => {
                const darkMode = data.darkMode;
                const html = document.documentElement;

                if (darkMode) {
                    html.classList.remove('light-mode');
                    html.classList.add('dark-mode');
                    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i><span class="toggle-text">Light Mode</span>';
                } else {
                    html.classList.remove('dark-mode');
                    html.classList.add('light-mode');
                    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i><span class="toggle-text">Dark Mode</span>';
                }
            })
            .catch(error => {
                console.error('Error loading preferences:', error);
            });
    }

    function saveDarkModePreference(isDarkMode) {
        fetch('/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                darkMode: isDarkMode
            })
        })
            .catch(error => {
                console.error('Error saving preferences:', error);
            });
    }
}); 