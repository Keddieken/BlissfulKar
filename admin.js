// Data will be fetched from the backend
let cars = [];
let addCarFiles = []; // To manage files for the "Add Car" form
let editCarFiles = []; // To manage files for the "Edit Car" form

// --- IMPORTANT ---
// Replace 'localhost' with your computer's local IP address to test on other devices (e.g., your phone).
// Example: 'http://192.168.1.10:3001/api/cars'
// Using a hardcoded IP is not suitable for production.
// A relative URL is more portable across different environments.
// const API_BASE_URL = 'http://192.168.0.170:3001/api';
const API_BASE_URL = '/api';
const API_URL = `${API_BASE_URL}/cars`;

// DOM Elements
const manageCarsViewBtn = document.getElementById('manage-cars-view-btn');
const addCarViewBtn = document.getElementById('add-car-view-btn');
const changePasswordBtn = document.getElementById('change-password-btn');
const logoutBtn = document.getElementById('logout-btn');

const manageCarsPanel = document.getElementById('manage-cars-panel');
const addCarPanel = document.getElementById('add-car-panel');
const editCarPanel = document.getElementById('edit-car-panel');
const changePasswordPanel = document.getElementById('change-password-panel');

const addCarForm = document.getElementById('add-car-form');
const editCarForm = document.getElementById('edit-car-form');
const changePasswordForm = document.getElementById('change-password-form');

// Initialize the admin dashboard
function initAdmin() {
    fetchAndRenderCars();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    manageCarsViewBtn.addEventListener('click', () => showPanel(manageCarsPanel));
    addCarViewBtn.addEventListener('click', () => showPanel(addCarPanel));
    changePasswordBtn.addEventListener('click', () => {
        showPanel(changePasswordPanel);
        // The form is now self-contained, no pre-filling needed from insecure sources.
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE_URL}/admin/logout`, { method: 'POST' });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            window.location.href = 'index.html';
        }
    });

    // Add car form submit
    addCarForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const notificationArea = document.getElementById('add-car-notification');
        notificationArea.textContent = ''; // Clear previous messages

        const formData = new FormData();
        formData.append('model', document.getElementById('new-car-model').value.trim());
        formData.append('year', parseInt(document.getElementById('new-car-year').value));
        formData.append('seating', parseInt(document.getElementById('new-car-seating').value));
        formData.append('transmission', document.getElementById('new-car-transmission').value.trim());
        formData.append('description', document.getElementById('new-car-description').value.trim());
        formData.append('features', document.getElementById('new-car-features').value.split(',').map(f => f.trim()).filter(f => f).join(','));
        formData.append('featured', document.getElementById('new-car-featured').checked);

        for (const file of addCarFiles) {
            formData.append('images', file);
        }
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) window.location.href = 'login.html';
                throw new Error(errorData.error || 'Failed to add car');
            }
            
            addCarForm.reset();
            showPanel(manageCarsPanel);
            document.getElementById('new-car-image-previews').innerHTML = ''; // Clear previews
            addCarFiles = []; // Clear file store
            fetchAndRenderCars();
        } catch (error) {
            console.error('Error adding car:', error);
            notificationArea.textContent = 'Could not add the car. Please try again.';
        }
    });

    document.getElementById('cancel-add-car').addEventListener('click', () => showPanel(manageCarsPanel));

    // Handle image previews for Add Car form
    document.getElementById('new-car-images').addEventListener('change', (e) => handleFileSelect(e, 'new-car-image-previews', 'add'));

    // Edit car form submit
    editCarForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const carId = document.getElementById('edit-car-id').value;
        const formData = new FormData();
        formData.append('model', document.getElementById('edit-car-model').value.trim());
        formData.append('year', parseInt(document.getElementById('edit-car-year').value));
        formData.append('seating', parseInt(document.getElementById('edit-car-seating').value));
        formData.append('transmission', document.getElementById('edit-car-transmission').value.trim());
        formData.append('description', document.getElementById('edit-car-description').value.trim());
        formData.append('features', document.getElementById('edit-car-features').value.split(',').map(f => f.trim()).filter(f => f).join(','));
        formData.append('featured', document.getElementById('edit-car-featured').checked);

        for (const file of editCarFiles) {
            formData.append('images', file);
        }

        try {
            const response = await fetch(`${API_URL}/${carId}`, {
                method: 'PUT',
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) window.location.href = 'login.html';
                throw new Error(errorData.error || 'Failed to update car');
            }
            
            showPanel(manageCarsPanel);
            document.getElementById('edit-car-image-previews').innerHTML = ''; // Clear previews
            editCarFiles = []; // Clear file store
            fetchAndRenderCars(); // Refresh the list
        } catch (error) {
            console.error('Error updating car:', error);
            alert(error.message || 'Could not update the car. Please check the console for errors.');
        }
    });
    document.getElementById('cancel-edit-car').addEventListener('click', () => showPanel(manageCarsPanel));

    // Handle image previews for Edit Car form
    document.getElementById('edit-car-images').addEventListener('change', (e) => handleFileSelect(e, 'edit-car-image-previews', 'edit'));

    // Change password form submit
    changePasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const notificationArea = document.getElementById('password-notification');
        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        const newUsername = document.getElementById('update-username').value.trim();
        const currentPassword = document.getElementById('current-password').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();
        const confirmNewPassword = document.getElementById('confirm-new-password').value.trim();

        notificationArea.textContent = '';
        notificationArea.style.color = '';

        if (newPassword !== confirmNewPassword) {
            notificationArea.textContent = 'New passwords do not match.';
            notificationArea.style.color = 'red';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Credentials';
            return;
        }

        if (newPassword.length < 6) {
            notificationArea.textContent = 'New password must be at least 6 characters long.';
            notificationArea.style.color = 'red';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Credentials';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/admin/update-credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername, currentPassword, newPassword })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update credentials.');
            }

            notificationArea.textContent = 'Credentials updated successfully! Please log in again.';
            notificationArea.style.color = 'green';
            // Log out the user to force re-authentication after a short delay
            setTimeout(() => logoutBtn.click(), 2000);

        } catch (error) {
            console.error('Error updating credentials:', error);
            notificationArea.textContent = `Error: ${error.message}`;
            notificationArea.style.color = 'red';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Credentials';
        }
    });
}

// Show a specific admin panel
function showPanel(panelToShow) {
    [manageCarsPanel, addCarPanel, editCarPanel, changePasswordPanel].forEach(panel => {
        panel.style.display = 'none';
    });
    panelToShow.style.display = 'block';
}

// Fetch cars from the backend and render them
async function fetchAndRenderCars() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            // If unauthorized, redirect to login
            if (response.status === 401 || response.status === 403) window.location.href = 'login.html';
            throw new Error('Network response was not ok');
        }
        cars = await response.json();
        renderAdminCars();
    } catch (error) {
        console.error('Failed to fetch cars:', error);
        document.querySelector('#manage-cars-panel .cars-grid').innerHTML = '<p>Error loading cars. Is the backend server running?</p>';
    }
}

// Render cars in the admin grid
function renderAdminCars() {
    const adminCarsGrid = document.querySelector('#manage-cars-panel .cars-grid');
    adminCarsGrid.innerHTML = '';
    
    cars.forEach(car => {
        const card = createCarCard(car);
        const adminControls = document.createElement('div');
        adminControls.style.display = 'flex';
        adminControls.style.justifyContent = 'space-between';
        adminControls.style.marginTop = '1rem';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditForm(car);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-outline';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Show a confirmation dialog before deleting
            if (!confirm(`Are you sure you want to permanently delete the "${car.model}"? This cannot be undone.`)) {
                return; // Stop if the user clicks "Cancel"
            }
            try {
                const response = await fetch(`${API_URL}/${car.id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json();
                    if (response.status === 401 || response.status === 403) window.location.href = 'login.html';
                    throw new Error(errorData.error || 'Failed to delete car');
                }
                fetchAndRenderCars();
            } catch (error) {
                console.error('Error deleting car:', error);
                alert('Failed to delete car.');
            }
        });
        
        adminControls.appendChild(editBtn);
        adminControls.appendChild(deleteBtn);
        card.querySelector('.car-details').appendChild(adminControls);
        
        adminCarsGrid.appendChild(card);
    });
}

// Open and populate the edit form
function openEditForm(car) {
    document.getElementById('edit-car-id').value = car.id;
    document.getElementById('edit-car-model').value = car.model;
    document.getElementById('edit-car-year').value = car.year;
    document.getElementById('edit-car-seating').value = car.seating;
    document.getElementById('edit-car-transmission').value = car.transmission;
    document.getElementById('edit-car-description').value = car.description;
    document.getElementById('edit-car-features').value = car.features.join(', ');
    document.getElementById('edit-car-featured').checked = car.featured || false;
    // Clear the file input
    document.getElementById('edit-car-images').value = '';
    document.getElementById('edit-car-image-previews').innerHTML = '';
    showPanel(editCarPanel);
}

// Create a car card element (simplified, no click to details)
function createCarCard(car) {
    const card = document.createElement('div');
    card.className = 'car-card';
    const primaryImage = car.images && car.images.length > 0 ? car.images[0] : 'placeholder.jpg';
    card.innerHTML = `
        <div class="car-image"><img src="${primaryImage}" alt="${car.model}"></div>
        <div class="car-details">
            <h3 class="car-title">${car.model}</h3>
        </div>
    `;
    return card;
}

// Handle file selection and preview generation
function handleFileSelect(event, previewContainerId, formType) {
    const previewContainer = document.getElementById(previewContainerId);
    previewContainer.innerHTML = ''; // Clear existing previews
    
    // Use a DataTransfer object to more robustly manage the file list
    const dataTransfer = new DataTransfer();
    Array.from(event.target.files).forEach(file => dataTransfer.items.add(file));

    if (formType === 'add') {
        addCarFiles = Array.from(dataTransfer.files);
    } else {
        editCarFiles = Array.from(dataTransfer.files);
    }

    const renderPreviews = () => {
        previewContainer.innerHTML = '';
        const currentFiles = formType === 'add' ? addCarFiles : editCarFiles;

        currentFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'image-preview';

            const img = document.createElement('img');
            img.src = e.target.result;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove image';
            removeBtn.onclick = function() {
                // Remove the file from the appropriate array and the preview from the DOM
                const filesRef = formType === 'add' ? addCarFiles : editCarFiles;
                filesRef.splice(index, 1);

                // Re-render previews to update indices
                renderPreviews();
            };

            previewWrapper.appendChild(img);
            previewWrapper.appendChild(removeBtn);
            previewContainer.appendChild(previewWrapper);
        }
        reader.readAsDataURL(file);
    });
    };

    renderPreviews();
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initAdmin);