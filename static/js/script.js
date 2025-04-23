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
    let currentFileId = null;
    let animations = true; // Enable animations by default

    // Initialize the app
    init();

    function init() {
        // Add initial animation to some elements
        if (animations) {
            const elementsToAnimate = [fileLabel, document.querySelector('.upload-container')];
            elementsToAnimate.forEach(el => {
                if (el) el.classList.add('animate-fade-in');
            });
        }

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

        // Initialize form handlers
        initializeFormHandlers();

        // Check if the user prefers reduced motion
        checkReducedMotion();

        // Add event listeners for button effects
        addButtonEffects();
    }

    function checkReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        animations = !prefersReducedMotion.matches;

        // Listen for changes to the prefers-reduced-motion media query
        prefersReducedMotion.addEventListener('change', (event) => {
            animations = !event.matches;
        });
    }

    function addButtonEffects() {
        const buttons = document.querySelectorAll('button, .file-label, .add-more-btn');

        buttons.forEach(button => {
            // Add ripple effect
            button.addEventListener('click', createRipple);

            // Add hover animation
            button.addEventListener('mouseenter', function () {
                if (animations && !this.classList.contains('animate-hover')) {
                    this.classList.add('animate-hover');
                }
            });

            button.addEventListener('mouseleave', function () {
                this.classList.remove('animate-hover');
            });
        });
    }

    function createRipple(event) {
        if (!animations) return;

        const button = event.currentTarget;

        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        const rect = button.getBoundingClientRect();

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];

        if (ripple) {
            ripple.remove();
        }

        button.appendChild(circle);

        // Remove the ripple after animation completes
        setTimeout(() => {
            if (circle) {
                circle.remove();
            }
        }, 600);
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
            animation: animations ? 150 : 0,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.sortable-item',
            onStart: function () {
                if (animations) {
                    // Add a subtle scale effect to indicate dragging has started
                    document.body.classList.add('sorting-active');
                }
            },
            onEnd: function () {
                // Update the ordering of files after drag ends
                document.body.classList.remove('sorting-active');
                const items = sortableFilesList.querySelectorAll('.sortable-item');
                const newOrder = Array.from(items).map(item => parseInt(item.dataset.id));

                // Add a subtle flash effect to indicate order has changed
                if (animations) {
                    sortableFilesList.classList.add('order-updated');
                    setTimeout(() => {
                        sortableFilesList.classList.remove('order-updated');
                    }, 300);
                }
            }
        });
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
        // Add pulse animation to the upload icon
        if (animations) {
            const uploadIcon = dropArea.querySelector('.upload-icon');
            if (uploadIcon) {
                uploadIcon.classList.add('pulse');
            }
        }
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
        // Remove pulse animation
        const uploadIcon = dropArea.querySelector('.upload-icon');
        if (uploadIcon) {
            uploadIcon.classList.remove('pulse');
        }
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

                // Store uploaded files information
                if (data.all_files) {
                    uploadedFiles = data.all_files;
                } else if (data.files) {
                    // Add new files to existing array
                    uploadedFiles = uploadedFiles.concat(data.files);
                }

                sessionId = data.session_id;

                // Display files
                displayFiles();

                // Show success message for added files
                showAlert(`Added ${files.length} file${files.length > 1 ? 's' : ''} successfully.`, 'success');
            })
            .catch(error => {
                hideLoading();
                showAlert('Error uploading files: ' + error.message, 'error');
            });
    }

    // Display the list of uploaded files
    function displayFiles() {
        sortableFilesList.innerHTML = '';

        if (uploadedFiles.length === 0) {
            mergeButton.disabled = true;
            return;
        }

        uploadedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'sortable-item';
            li.dataset.id = file.id;

            if (animations) {
                // Add staggered animation to items
                li.style.animationDelay = `${index * 50}ms`;
                li.classList.add('animate-slide-in');
            }

            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';

            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-icon';
            fileIcon.innerHTML = '<i class="fas fa-file-pdf"></i>';

            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            const pageCount = document.createElement('div');
            pageCount.className = 'file-pages';
            pageCount.innerHTML = `<i class="fas fa-file-alt"></i> ${file.pages} page${file.pages !== 1 ? 's' : ''}`;

            fileDetails.appendChild(fileIcon);
            fileDetails.appendChild(fileName);
            fileDetails.appendChild(pageCount);

            const fileActions = document.createElement('div');
            fileActions.className = 'file-actions';

            // Preview button
            const previewBtn = document.createElement('button');
            previewBtn.className = 'preview-btn';
            previewBtn.title = 'Preview';
            previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
            previewBtn.addEventListener('click', function () {
                showPreview(file.id);
            });

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.title = 'Remove';
            removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            removeBtn.addEventListener('click', function () {
                removeFile(file.id);
            });

            fileActions.appendChild(previewBtn);
            fileActions.appendChild(removeBtn);

            li.appendChild(fileDetails);
            li.appendChild(fileActions);

            sortableFilesList.appendChild(li);
        });

        updateMergeButtonState();

        // Add button effects to the new buttons
        addButtonEffects();
    }

    // Helper function to swap array elements
    function arrayMove(arr, fromIndex, toIndex) {
        const element = arr[fromIndex];
        arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, element);
    }

    function moveFile(fileId, direction) {
        const index = uploadedFiles.findIndex(file => file.id === fileId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            arrayMove(uploadedFiles, index, index - 1);
        } else if (direction === 'down' && index < uploadedFiles.length - 1) {
            arrayMove(uploadedFiles, index, index + 1);
        } else {
            return;
        }

        displayFiles();
    }

    function showPreview(fileId) {
        previewContainer.classList.remove('hidden');

        // Smooth scroll to preview
        if (animations) {
            previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        currentFileId = fileId;
        const previewUrl = `/preview/${sessionId}/${fileId}`;
        pdfPreview.src = previewUrl;

        // Add loading state to preview
        pdfPreview.classList.add('loading');

        // Remove loading state when preview is loaded
        pdfPreview.onload = function () {
            pdfPreview.classList.remove('loading');
        };
    }

    function removeFile(fileId) {
        // Animation for removal
        if (animations) {
            const fileItem = document.querySelector(`.sortable-item[data-id="${fileId}"]`);
            if (fileItem) {
                fileItem.classList.add('animate-remove');

                // Wait for animation to complete before removing from DOM
                setTimeout(() => {
                    uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
                    displayFiles();
                    updateMergeButtonState();

                    // If we're showing a preview of the file being removed, hide the preview
                    if (currentFileId === fileId) {
                        previewContainer.classList.add('hidden');
                        currentFileId = null;
                    }

                    // Show feedback
                    showAlert('File removed successfully.', 'success');
                }, 300);
            }
        } else {
            uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
            displayFiles();
            updateMergeButtonState();

            // If we're showing a preview of the file being removed, hide the preview
            if (currentFileId === fileId) {
                previewContainer.classList.add('hidden');
                currentFileId = null;
            }

            // Show feedback
            showAlert('File removed successfully.', 'success');
        }
    }

    function updateMergeButtonState() {
        mergeButton.disabled = uploadedFiles.length < 1;

        if (uploadedFiles.length >= 1) {
            mergeButton.classList.remove('disabled');
        } else {
            mergeButton.classList.add('disabled');
        }
    }

    function goToStep1() {
        if (animations) {
            step2.classList.add('animate-slide-out');

            setTimeout(() => {
                step2.classList.add('hidden');
                step2.classList.remove('animate-slide-out');
                step1.classList.remove('hidden');
                step1.classList.add('animate-slide-in');

                setTimeout(() => {
                    step1.classList.remove('animate-slide-in');
                }, 300);
            }, 300);
        } else {
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
        }
    }

    function goToStep2() {
        if (animations) {
            step1.classList.add('animate-slide-out');

            setTimeout(() => {
                step1.classList.add('hidden');
                step1.classList.remove('animate-slide-out');
                step2.classList.remove('hidden');
                step2.classList.add('animate-slide-in');

                setTimeout(() => {
                    step2.classList.remove('animate-slide-in');
                }, 300);
            }, 300);
        } else {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        }
    }

    function mergePDFs() {
        if (uploadedFiles.length === 0) {
            showAlert('Please add at least one PDF file to merge.', 'error');
            return;
        }

        showLoading();

        // Get file IDs in their current order for merging
        const fileIds = Array.from(sortableFilesList.querySelectorAll('.sortable-item')).map(item => parseInt(item.dataset.id));

        // Prepare data for the request
        const data = {
            files: fileIds,
            addPageNumbers: addPageNumbers.checked
        };

        // Send the merge request
        fetch('/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                hideLoading();

                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Error merging PDFs.');
                    });
                }

                // For successful response, trigger download
                showAlert('PDFs merged successfully! Downloading...', 'success');

                // Create a download link
                const downloadUrl = window.URL.createObjectURL(new Blob([response.body]));
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', 'merged_document.pdf');
                document.body.appendChild(link);
                link.click();

                // Clean up
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(link);

                // Return to step 1 for a new operation
                setTimeout(() => {
                    resetForm();
                    goToStep1();
                }, 1500);

                return null;
            })
            .catch(error => {
                hideLoading();
                showAlert(error.message, 'error');
            });
    }

    function resetForm() {
        // Clear uploaded files
        uploadedFiles = [];
        sessionId = null;

        // Reset file inputs
        fileInput.value = '';
        if (addMoreFilesInput) addMoreFilesInput.value = '';

        // Reset UI elements
        if (sortableFilesList) sortableFilesList.innerHTML = '';
        if (previewContainer) previewContainer.classList.add('hidden');

        // Reset options
        if (addPageNumbers) addPageNumbers.checked = false;

        // Clear any alerts
        alertContainer.innerHTML = '';

        // Disable merge button
        updateMergeButtonState();
    }

    function showAlert(message, type) {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;

        const icon = type === 'error' ? 'exclamation-circle' : 'check-circle';
        alertElement.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'alert-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function () {
            alertElement.remove();
        });

        alertElement.appendChild(closeBtn);

        // Add animation class
        if (animations) {
            alertElement.classList.add('animate-slide-down');
        }

        // Remove previous alerts of the same type
        const previousAlerts = alertContainer.querySelectorAll(`.alert-${type}`);
        previousAlerts.forEach(alert => {
            alert.remove();
        });

        alertContainer.appendChild(alertElement);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                if (animations) {
                    alertElement.classList.add('animate-fade-out');
                    setTimeout(() => {
                        if (alertElement.parentNode) {
                            alertElement.remove();
                        }
                    }, 300);
                } else {
                    alertElement.remove();
                }
            }
        }, 5000);
    }

    function showLoading() {
        loadingOverlay.classList.remove('hidden');
        if (animations) {
            loadingOverlay.classList.add('animate-fade-in');
        }
    }

    function hideLoading() {
        if (animations) {
            loadingOverlay.classList.add('animate-fade-out');
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('animate-fade-out', 'animate-fade-in');
            }, 300);
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }

    function toggleDarkMode() {
        const html = document.documentElement;
        const isDarkMode = html.classList.contains('dark-mode');
        const toggleText = document.querySelector('.toggle-text');
        const toggleIcon = darkModeToggle.querySelector('i');

        if (isDarkMode) {
            // Switch to light mode
            html.classList.remove('dark-mode');
            html.classList.add('light-mode');
            toggleText.textContent = 'Dark Mode';
            toggleIcon.classList.remove('fa-sun');
            toggleIcon.classList.add('fa-moon');
        } else {
            // Switch to dark mode
            html.classList.remove('light-mode');
            html.classList.add('dark-mode');
            toggleText.textContent = 'Light Mode';
            toggleIcon.classList.remove('fa-moon');
            toggleIcon.classList.add('fa-sun');
        }

        // Save preference
        saveDarkModePreference(!isDarkMode);
    }

    function loadDarkModePreference() {
        // Check if preference exists in localStorage
        if (localStorage.getItem('darkMode')) {
            const isDarkMode = localStorage.getItem('darkMode') === 'true';
            const html = document.documentElement;
            const toggleText = document.querySelector('.toggle-text');
            const toggleIcon = darkModeToggle.querySelector('i');

            // Apply saved preference
            if (isDarkMode) {
                html.classList.remove('light-mode');
                html.classList.add('dark-mode');
                toggleText.textContent = 'Light Mode';
                toggleIcon.classList.remove('fa-moon');
                toggleIcon.classList.add('fa-sun');
            } else {
                html.classList.remove('dark-mode');
                html.classList.add('light-mode');
                toggleText.textContent = 'Dark Mode';
                toggleIcon.classList.remove('fa-sun');
                toggleIcon.classList.add('fa-moon');
            }
        } else {
            // If no preference, check system preference
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
            if (prefersDarkScheme.matches) {
                document.documentElement.classList.add('dark-mode');
                document.documentElement.classList.remove('light-mode');
                darkModeToggle.querySelector('.toggle-text').textContent = 'Light Mode';
                darkModeToggle.querySelector('i').classList.remove('fa-moon');
                darkModeToggle.querySelector('i').classList.add('fa-sun');
                saveDarkModePreference(true);
            }
        }
    }

    function saveDarkModePreference(isDarkMode) {
        localStorage.setItem('darkMode', isDarkMode);

        // Send preference to server if API exists
        fetch('/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ darkMode: isDarkMode })
        }).catch(error => {
            console.error('Error saving preferences:', error);
        });
    }

    function initializeFormHandlers() {
        // Add any additional form event handlers here
    }
});