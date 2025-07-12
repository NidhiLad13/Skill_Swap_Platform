/**
 * Skill Swap Platform Frontend JavaScript
 * Handles user interactions and dynamic content
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Initialize the application
    SkillSwapPlatform.init();
});

/**
 * Main Skill Swap Platform Object
 */
const SkillSwapPlatform = {

    /**
     * Initialize the platform
     */
    init: function() {
        this.initEventListeners();
        this.initRatingSystem();
        this.initSearchFilters();
        this.initTooltips();
        this.initModals();
        this.initAnimations();
        this.initFormValidation();
    },

    /**
     * Initialize event listeners
     */
    initEventListeners: function() {
        // Skill card interactions
        document.querySelectorAll('.skill-card').forEach(card => {
            card.addEventListener('click', this.handleSkillCardClick.bind(this));
        });

        // Swap request buttons
        document.querySelectorAll('.btn-request-swap').forEach(btn => {
            btn.addEventListener('click', this.handleSwapRequest.bind(this));
        });

        // Accept/Reject swap buttons
        document.querySelectorAll('.btn-accept-swap').forEach(btn => {
            btn.addEventListener('click', this.handleAcceptSwap.bind(this));
        });

        document.querySelectorAll('.btn-reject-swap').forEach(btn => {
            btn.addEventListener('click', this.handleRejectSwap.bind(this));
        });

        // Profile update buttons
        document.querySelectorAll('.btn-update-profile').forEach(btn => {
            btn.addEventListener('click', this.handleProfileUpdate.bind(this));
        });

        // Search input
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', this.handleFilterTab.bind(this));
        });
    },

    /**
     * Initialize rating system
     */
    initRatingSystem: function() {
        document.querySelectorAll('.rating-input').forEach(ratingInput => {
            const stars = ratingInput.querySelectorAll('.rating-star');

            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    this.setRating(ratingInput, index + 1);
                });

                star.addEventListener('mouseenter', () => {
                    this.highlightStars(ratingInput, index + 1);
                });
            });

            ratingInput.addEventListener('mouseleave', () => {
                const currentRating = parseInt(ratingInput.dataset.rating) || 0;
                this.highlightStars(ratingInput, currentRating);
            });
        });
    },

    /**
     * Set rating value
     */
    setRating: function(ratingInput, rating) {
        ratingInput.dataset.rating = rating;
        this.highlightStars(ratingInput, rating);

        // Update hidden input if exists
        const hiddenInput = ratingInput.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            hiddenInput.value = rating;
        }

        // Trigger change event
        ratingInput.dispatchEvent(new CustomEvent('ratingChanged', {
            detail: { rating: rating }
        }));
    },

    /**
     * Highlight stars up to given rating
     */
    highlightStars: function(ratingInput, rating) {
        const stars = ratingInput.querySelectorAll('.rating-star');

        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('empty');
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
                star.classList.add('empty');
            }
        });
    },

    /**
     * Initialize search and filters
     */
    initSearchFilters: function() {
        this.currentFilters = {
            search: '',
            category: 'all',
            location: 'all',
            rating: 'all'
        };
    },

    /**
     * Handle search input
     */
    handleSearch: function(event) {
        const searchTerm = event.target.value.trim();
        this.currentFilters.search = searchTerm;
        this.applyFilters();
    },

    /**
     * Handle filter tab clicks
     */
    handleFilterTab: function(event) {
        event.preventDefault();

        const tab = event.target;
        const filterType = tab.dataset.filter;
        const filterValue = tab.dataset.value;

        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update filter
        this.currentFilters[filterType] = filterValue;
        this.applyFilters();
    },

    /**
     * Apply current filters to skill cards
     */
    applyFilters: function() {
        const skillCards = document.querySelectorAll('.skill-card');

        skillCards.forEach(card => {
            const shouldShow = this.cardMatchesFilters(card);

            if (shouldShow) {
                card.style.display = 'block';
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        });

        this.updateResultsCount();
    },

    /**
     * Check if card matches current filters
     */
    cardMatchesFilters: function(card) {
        const { search, category, location, rating } = this.currentFilters;

        // Search filter
        if (search) {
            const cardText = card.textContent.toLowerCase();
            if (!cardText.includes(search.toLowerCase())) {
                return false;
            }
        }

        // Category filter
        if (category !== 'all') {
            const cardCategory = card.dataset.category;
            if (cardCategory !== category) {
                return false;
            }
        }

        // Location filter
        if (location !== 'all') {
            const cardLocation = card.dataset.location;
            if (cardLocation !== location) {
                return false;
            }
        }

        // Rating filter
        if (rating !== 'all') {
            const cardRating = parseFloat(card.dataset.rating) || 0;
            const minRating = parseFloat(rating);
            if (cardRating < minRating) {
                return false;
            }
        }

        return true;
    },

    /**
     * Update results count
     */
    updateResultsCount: function() {
        const visibleCards = document.querySelectorAll('.skill-card:not([style*="display: none"])');
        const countElement = document.querySelector('.results-count');

        if (countElement) {
            countElement.textContent = `${visibleCards.length} results found`;
        }
    },

    /**
     * Handle skill card click
     */
    handleSkillCardClick: function(event) {
        // Don't trigger if clicking on buttons or links
        if (event.target.closest('button, a')) {
            return;
        }

        const card = event.currentTarget;
        const skillId = card.dataset.skillId;

        if (skillId) {
            this.showSkillDetails(skillId);
        }
    },

    /**
     * Show skill details modal
     */
    showSkillDetails: function(skillId) {
        // Here you would typically fetch skill details via AJAX
        // For now, we'll just show a placeholder modal

        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Skill Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading skill details...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Load skill details
        this.loadSkillDetails(skillId, modal);
    },

    /**
     * Load skill details via AJAX
     */
    loadSkillDetails: function(skillId, modal) {
        fetch(`/skill_swap/skill/${skillId}`)
            .then(response => response.json())
            .then(data => {
                const modalBody = modal.querySelector('.modal-body');
                modalBody.innerHTML = this.renderSkillDetails(data);
            })
            .catch(error => {
                console.error('Error loading skill details:', error);
                const modalBody = modal.querySelector('.modal-body');
                modalBody.innerHTML = '<div class="alert alert-danger">Failed to load skill details.</div>';
            });
    },

    /**
     * Render skill details HTML
     */
    renderSkillDetails: function(skill) {
        return `
            <div class="skill-details">
                <h4>${skill.name}</h4>
                <p><strong>Category:</strong> ${skill.category}</p>
                <p><strong>User:</strong> ${skill.user_name}</p>
                <p><strong>Description:</strong> ${skill.description}</p>
                <div class="rating-container">
                    <div class="rating-stars">
                        ${this.renderStars(skill.rating)}
                    </div>
                    <span class="rating-text">${skill.rating}/5</span>
                    <span class="rating-count">(${skill.review_count} reviews)</span>
                </div>
                <div class="mt-3">
                    <button class="btn btn-skill-swap btn-request-swap" data-skill-id="${skill.id}">
                        Request Skill Swap
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render star rating HTML
     */
    renderStars: function(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const className = i <= rating ? 'rating-star filled' : 'rating-star empty';
            stars += `<span class="${className}">★</span>`;
        }
        return stars;
    },

    /**
     * Handle swap request
     */
    handleSwapRequest: function(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const skillId = button.dataset.skillId;

        if (!skillId) {
            this.showAlert('Error: Skill ID not found', 'danger');
            return;
        }

        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Requesting...';
        button.disabled = true;

        // Send request
        this.sendSwapRequest(skillId)
            .then(response => {
                if (response.success) {
                    this.showAlert('Swap request sent successfully!', 'success');
                    button.textContent = 'Request Sent';
                    button.classList.add('btn-success');
                } else {
                    throw new Error(response.message || 'Failed to send request');
                }
            })
            .catch(error => {
                console.error('Error sending swap request:', error);
                this.showAlert('Failed to send swap request. Please try again.', 'danger');
                button.textContent = originalText;
                button.disabled = false;
            });
    },

    /**
     * Send swap request via AJAX
     */
    sendSwapRequest: function(skillId) {
        return fetch('/skill_swap/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                skill_id: skillId
            })
        })
        .then(response => response.json());
    },

    /**
     * Handle accept swap
     */
    handleAcceptSwap: function(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const requestId = button.dataset.requestId;

        this.updateSwapStatus(requestId, 'accepted', button);
    },

    /**
     * Handle reject swap
     */
    handleRejectSwap: function(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const requestId = button.dataset.requestId;

        this.updateSwapStatus(requestId, 'rejected', button);
    },

    /**
     * Update swap request status
     */
    updateSwapStatus: function(requestId, status, button) {
        const originalText = button.textContent;
        button.textContent = 'Updating...';
        button.disabled = true;

        fetch('/skill_swap/update_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                request_id: requestId,
                status: status
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showAlert('Profile updated successfully!', 'success');
                // Refresh page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            this.showAlert('Failed to update profile. Please try again.', 'danger');
        });
    },

    /**
     * Initialize tooltips
     */
    initTooltips: function() {
        // Initialize Bootstrap tooltips if available
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    },

    /**
     * Initialize modals
     */
    initModals: function() {
        // Close modal when clicking outside
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.remove();
            }
        });

        // Close modal when clicking close button
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-close') ||
                event.target.getAttribute('data-bs-dismiss') === 'modal') {
                const modal = event.target.closest('.modal');
                if (modal) {
                    modal.remove();
                }
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => modal.remove());
            }
        });
    },

    /**
     * Initialize animations
     */
    initAnimations: function() {
        // Intersection Observer for fade-in animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        });

        // Observe all skill cards
        document.querySelectorAll('.skill-card').forEach(card => {
            observer.observe(card);
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    },

    /**
     * Initialize form validation
     */
    initFormValidation: function() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        });

        // Real-time validation
        document.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearFieldError.bind(this));
        });
    },

    /**
     * Handle form submission
     */
    handleFormSubmit: function(event) {
        const form = event.target;
        const isValid = this.validateForm(form);

        if (!isValid) {
            event.preventDefault();
            this.showAlert('Please fix the errors in the form before submitting.', 'danger');
        }
    },

    /**
     * Validate entire form
     */
    validateForm: function(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            if (!this.validateField({ target: input })) {
                isValid = false;
            }
        });

        return isValid;
    },

    /**
     * Validate individual field
     */
    validateField: function(event) {
        const field = event.target;
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address.';
            }
        }

        // Phone validation
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number.';
            }
        }

        // Min length validation
        if (field.hasAttribute('minlength') && value) {
            const minLength = parseInt(field.getAttribute('minlength'));
            if (value.length < minLength) {
                isValid = false;
                errorMessage = `Minimum ${minLength} characters required.`;
            }
        }

        // Max length validation
        if (field.hasAttribute('maxlength') && value) {
            const maxLength = parseInt(field.getAttribute('maxlength'));
            if (value.length > maxLength) {
                isValid = false;
                errorMessage = `Maximum ${maxLength} characters allowed.`;
            }
        }

        // Show/hide error message
        if (isValid) {
            this.clearFieldError(event);
        } else {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    },

    /**
     * Show field error
     */
    showFieldError: function(field, message) {
        field.classList.add('is-invalid');

        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error text-danger small mt-1';
            field.parentNode.appendChild(errorElement);
        }

        errorElement.textContent = message;
    },

    /**
     * Clear field error
     */
    clearFieldError: function(event) {
        const field = event.target;
        field.classList.remove('is-invalid');

        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    },

    /**
     * Show alert message
     */
    showAlert: function(message, type = 'info') {
        const alertContainer = document.querySelector('.alert-container') || document.body;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.insertBefore(alert, alertContainer.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    },

    /**
     * Get CSRF token
     */
    getCSRFToken: function() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    },

    /**
     * Debounce function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show loading state
     */
    showLoading: function(element) {
        element.innerHTML = '<div class="loading-spinner"></div>';
        element.classList.add('loading');
    },

    /**
     * Hide loading state
     */
    hideLoading: function(element) {
        element.classList.remove('loading');
    },

    /**
     * Format date
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format time ago
     */
    timeAgo: function(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        }
    },

    /**
     * Copy text to clipboard
     */
    copyToClipboard: function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showAlert('Copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                this.showAlert('Failed to copy to clipboard.', 'danger');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                this.showAlert('Copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy: ', err);
                this.showAlert('Failed to copy to clipboard.', 'danger');
            }

            document.body.removeChild(textArea);
        }
    },

    /**
     * Handle file upload
     */
    handleFileUpload: function(inputElement, callback) {
        const file = inputElement.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            this.showAlert('Please select a valid image file (JPEG, PNG, or GIF).', 'danger');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showAlert('File size must be less than 5MB.', 'danger');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            if (callback) {
                callback(e.target.result);
            }
        };
        reader.readAsDataURL(file);
    },

    /**
     * Initialize notifications
     */
    initNotifications: function() {
        // Check for browser notification support
        if ('Notification' in window) {
            // Request permission if not granted
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        // Check for new notifications periodically
        setInterval(() => {
            this.checkNotifications();
        }, 30000); // Check every 30 seconds
    },

    /**
     * Check for new notifications
     */
    checkNotifications: function() {
        fetch('/skill_swap/notifications')
            .then(response => response.json())
            .then(data => {
                if (data.notifications && data.notifications.length > 0) {
                    this.showNotifications(data.notifications);
                }
            })
            .catch(error => {
                console.error('Error checking notifications:', error);
            });
    },

    /**
     * Show notifications
     */
    showNotifications: function(notifications) {
        notifications.forEach(notification => {
            if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/static/skill_swap_platform/images/logo.png'
                });
            } else {
                // Fallback to in-app notification
                this.showAlert(notification.message, 'info');
            }
        });
    }
};

/**
 * Utility functions
 */

// Auto-resize textareas
document.addEventListener('input', function(event) {
    if (event.target.tagName === 'TEXTAREA') {
        event.target.style.height = 'auto';
        event.target.style.height = event.target.scrollHeight + 'px';
    }
});

// Lazy load images
const lazyImages = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
        }
    });
});

lazyImages.forEach(img => {
    imageObserver.observe(img);
});

// Back to top button
const backToTopBtn = document.createElement('button');
backToTopBtn.innerHTML = '↑';
backToTopBtn.className = 'btn-back-to-top';
backToTopBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    display: none;
    z-index: 1000;
    transition: all 0.3s ease;
`;

document.body.appendChild(backToTopBtn);

// Show/hide back to top button
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopBtn.style.display = 'block';
    } else {
        backToTopBtn.style.display = 'none';
    }
});

// Scroll to top when clicked
backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Export for global access
window.SkillSwapPlatform = SkillSwapPlatform;(`Swap request ${status} successfully!`, 'success');
                button.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                button.classList.add(status === 'accepted' ? 'btn-success' : 'btn-danger');

                // Update status badge
                const statusBadge = button.closest('.skill-card').querySelector('.swap-status');
                if (statusBadge) {
                    statusBadge.textContent = status;
                    statusBadge.className = `swap-status ${status}`;
                }
            } else {
                throw new Error(data.message || 'Failed to update status');
            }
        })
        .catch(error => {
            console.error('Error updating swap status:', error);
            this.showAlert('Failed to update swap status. Please try again.', 'danger');
            button.textContent = originalText;
            button.disabled = false;
        });
    },

    /**
     * Handle profile update
     */
    handleProfileUpdate: function(event) {
        event.preventDefault();

        const form = event.target.closest('form');
        const formData = new FormData(form);

        fetch('/skill_swap/update_profile', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': this.getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showAlert