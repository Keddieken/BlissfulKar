// Data will be fetched from the backend
let cars = [];
// --- IMPORTANT ---
// Use relative URLs so the frontend can be served from anywhere.
const API_URL = '/api/cars';
const CONTACT_API_URL = '/api/contact';
 
// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');
const exploreCarsBtn = document.querySelector('.explore-cars');
 
// Filter elements
const searchInput = document.getElementById('search-input');
const transmissionFilter = document.getElementById('transmission-filter');
const seatingFilter = document.getElementById('seating-filter');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Initialize the application
function init() {
    // Fetch cars from backend and render them
    fetchAndRenderCars();
    
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            navigateTo(pageId);
            // Close mobile menu if open
            navLinksContainer.classList.remove('active');
        });
    });
    
    // Footer links navigation
    const footerLinks = document.querySelectorAll('.footer-section a');
    footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.getAttribute('data-page')) {
                const pageId = link.getAttribute('data-page');
                navigateTo(pageId);
            }
        });
    });
    
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });
    
    // Explore cars button
    exploreCarsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('cars');
    });
    
    // Contact buttons
    const contactButtons = document.querySelectorAll('.contact-btn');
    contactButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('contact');
        });
    });
    
    // Back buttons
    const backToHomeBtn = document.getElementById('back-to-home-btn');
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => navigateTo('home'));
    }

    const backToCarsBtn = document.getElementById('back-to-cars-btn');
    if (backToCarsBtn) {
        backToCarsBtn.addEventListener('click', () => navigateTo('cars'));
    }

    // Filter controls
    if (searchInput) searchInput.addEventListener('input', renderCars);
    if (transmissionFilter) transmissionFilter.addEventListener('change', renderCars);
    if (seatingFilter) seatingFilter.addEventListener('change', renderCars);
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            transmissionFilter.value = '';
            seatingFilter.value = '';
            renderCars();
        });
    }

    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            const notificationArea = document.getElementById('form-notification');
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value,
            };

            notificationArea.textContent = '';
            notificationArea.style.color = '';

            try {
                const response = await fetch(CONTACT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                const result = await response.json();

                if (response.ok) {
                    notificationArea.textContent = result.message;
                    notificationArea.style.color = 'green';
                    contactForm.reset();
                } else {
                    throw new Error(result.message || 'An unknown error occurred.');
                }

            } catch (error) {
                console.error('Contact form submission error:', error);
                notificationArea.textContent = error.message || 'Sorry, there was an error sending your message. Please try again later.';
                notificationArea.style.color = 'red';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }
}

// Fetch cars from the backend and render them
async function fetchAndRenderCars() {
    const allCarsGrid = document.querySelector('#cars .cars-grid');
    const featuredCarsGrid = document.querySelector('#home .cars-grid');
    
    // Show loaders
    allCarsGrid.innerHTML = '<div class="loader"></div>';
    featuredCarsGrid.innerHTML = '<div class="loader"></div>';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        cars = await response.json();
        renderCars();
    } catch (error) {
        console.error('Failed to fetch cars:', error);
        // Display an error message to the user
        allCarsGrid.innerHTML = '<p>Error loading cars. Is the backend server running?</p>';
        featuredCarsGrid.innerHTML = '<p>Error loading cars.</p>';
    }
}

// Navigate to a page
function navigateTo(pageId) {
    // Hide all pages
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    document.getElementById(pageId).classList.add('active');
    
    // Update active nav link
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // If navigating to cars or admin dashboard, refresh the car lists
    if (pageId === 'cars' || pageId === 'home') {
        fetchAndRenderCars();
    }
}

// Render cars in the grids
function renderCars() {    
    
    if (!cars || cars.length === 0) {
        // Handle case where cars haven't been loaded yet or there are no cars
        return;
    }

    // --- Filtering Logic ---
    const searchTerm = searchInput.value.toLowerCase();
    const transmission = transmissionFilter.value;
    const seating = seatingFilter.value;

    let filteredCars = cars.filter(car => {
        // Search filter
        const matchesSearch = car.model.toLowerCase().includes(searchTerm);

        // Transmission filter
        const matchesTransmission = !transmission || car.transmission === transmission;

        // Seating filter
        let matchesSeating = true;
        if (seating) {
            if (seating === '2') matchesSeating = car.seating <= 2;
            else if (seating === '4') matchesSeating = car.seating >= 3 && car.seating <= 5;
            else if (seating === '7') matchesSeating = car.seating >= 6;
        }

        return matchesSearch && matchesTransmission && matchesSeating;
    });

    // --- Rendering Logic ---
    // Home page featured cars
    const featuredCarsGrid = document.querySelector('#home .cars-grid');
    featuredCarsGrid.innerHTML = '';
    const featuredCars = cars.filter(car => car.featured);
    featuredCars.forEach(car => {
        featuredCarsGrid.appendChild(createCarCard(car));
    });

    // Cars page - render filtered cars
    const allCarsGrid = document.querySelector('#cars .cars-grid');
    allCarsGrid.innerHTML = '';
    
    if (filteredCars.length === 0) {
        allCarsGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No cars match your criteria.</p>';
    } else {
        filteredCars.forEach(car => {
            allCarsGrid.appendChild(createCarCard(car));
        });
    }
}

// Create a car card element
function createCarCard(car) {
    const card = document.createElement('div');
    card.className = 'car-card';
    // Use the first image in the images array as the primary card image
    const primaryImage = car.images && car.images.length > 0 ? car.images[0] : 'placeholder.jpg';
    card.innerHTML = `
        <div class="car-image">
            <img src="${primaryImage}" alt="${car.model}">
        </div>
        <div class="car-details">
            <h3 class="car-title">${car.model}</h3>

            <div class="car-specs">
                <div class="car-spec">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${car.year}</span>
                </div>
                <div class="car-spec">
                    <i class="fas fa-users"></i>
                    <span>${car.seating} Seats</span>
                </div>
                <div class="car-spec">
                    <i class="fas fa-cog"></i>
                    <span>${car.transmission}</span>
                </div>
            </div>
        </div>
    `;
    
    // Add click event to view details
    card.addEventListener('click', () => {
        showCarDetails(car);
    });
    
    return card;
}

// Show car details
function showCarDetails(car) {
    const detailImage = document.getElementById('detail-image');
    const thumbnailsContainer = document.getElementById('detail-thumbnails');
    thumbnailsContainer.innerHTML = ''; // Clear previous thumbnails

    // Update details page with car information
    const primaryImage = car.images && car.images.length > 0 ? car.images[0] : 'placeholder.jpg';
    detailImage.src = primaryImage;
    document.getElementById('detail-title').textContent = car.model;

    // Create and add thumbnails if there are multiple images
    if (car.images && car.images.length > 0) {
        car.images.forEach((imageUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imageUrl;
            thumb.alt = `${car.model} thumbnail`;
            thumb.className = 'car-detail-thumbnail';
            
            // Highlight the first thumbnail by default
            if (index === 0) {
                thumb.classList.add('active-thumbnail');
            }

            thumb.addEventListener('click', () => {
                detailImage.src = imageUrl; // Change main image on click
                // Update active thumbnail
                thumbnailsContainer.querySelector('.active-thumbnail')?.classList.remove('active-thumbnail');
                thumb.classList.add('active-thumbnail');
            });
            thumbnailsContainer.appendChild(thumb);
        });
    }

    document.getElementById('detail-year').textContent = car.year;
    document.getElementById('detail-seating').textContent = `${car.seating} Seats`;
    document.getElementById('detail-transmission').textContent = car.transmission;
    document.getElementById('detail-description').textContent = car.description;
    
    // Add features
    const featuresList = document.getElementById('detail-features');
    featuresList.innerHTML = '';
    car.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featuresList.appendChild(li);
    });
    
    // Navigate to details page
    navigateTo('car-details');
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);