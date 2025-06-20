// AI Facebook Ads Pro - Main JavaScript

// Global app state
window.AdsApp = {
    user: null,
    shop: null,
    notifications: [],
    modals: {},
    charts: {}
};

// Initialize application
function initializeApp() {
    console.log('🚀 Initializing AI Facebook Ads Pro...');
    
    // Setup global event listeners
    setupGlobalEventListeners();
    
    // Initialize notifications
    initializeNotifications();
    
    // Setup CSRF protection
    setupCSRFProtection();
    
    // Initialize tooltips
    initializeTooltips();
    
    console.log('✅ App initialized successfully');
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Handle escape key for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Handle clicks outside modals
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Handle form submissions
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.classList.contains('ajax-form')) {
            e.preventDefault();
            handleAjaxForm(form);
        }
    });
}

// Notification system
function initializeNotifications() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const id = 'notification-' + Date.now();
    
    notification.id = id;
    notification.className = `notification notification-${type} fade-in`;
    notification.style.cssText = `
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button onclick="closeNotification('${id}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin-left: 12px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => closeNotification(id), duration);
    }
    
    return id;
}

// Close notification
function closeNotification(id) {
    const notification = document.getElementById(id);
    if (notification) {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Get notification color based on type
function getNotificationColor(type) {
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#4299e1'
    };
    return colors[type] || colors.info;
}

// Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// Modal management
function showModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }
    
    // Store modal data
    window.AdsApp.modals[modalId] = data;
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('fade-in');
    
    // Focus first input
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'none';
    modal.classList.remove('fade-in');
    
    // Clear modal data
    delete window.AdsApp.modals[modalId];
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        closeModal(modal.id);
    });
}

// AJAX form handling
async function handleAjaxForm(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    
    try {
        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
        
        // Prepare form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Send request
        const response = await fetch(form.action, {
            method: form.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message || 'Operation completed successfully', 'success');
            
            // Handle redirect
            if (result.redirect) {
                window.location.href = result.redirect;
                return;
            }
            
            // Close modal if form is in modal
            const modal = form.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
            
            // Trigger custom event
            form.dispatchEvent(new CustomEvent('ajax-success', { detail: result }));
        } else {
            showNotification(result.error || 'An error occurred', 'error');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// CSRF protection
function setupCSRFProtection() {
    // Add CSRF token to all AJAX requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        if (options.method && options.method !== 'GET') {
            options.headers = options.headers || {};
            // Add CSRF token if available
            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            if (csrfToken) {
                options.headers['X-CSRF-Token'] = csrfToken.content;
            }
        }
        return originalFetch(url, options);
    };
}

// Tooltip initialization
function initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

// Show tooltip
function showTooltip(e) {
    const element = e.target;
    const text = element.getAttribute('data-tooltip');
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        white-space: nowrap;
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    
    element._tooltip = tooltip;
}

// Hide tooltip
function hideTooltip(e) {
    const element = e.target;
    if (element._tooltip) {
        document.body.removeChild(element._tooltip);
        delete element._tooltip;
    }
}

// Utility functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(new Date(date));
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Local storage helpers
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('LocalStorage error:', error);
    }
}

function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('LocalStorage error:', error);
        return defaultValue;
    }
}

// API helpers
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Export for use in other scripts
window.AdsApp.utils = {
    showNotification,
    closeNotification,
    showModal,
    closeModal,
    formatCurrency,
    formatNumber,
    formatDate,
    formatRelativeTime,
    debounce,
    throttle,
    setLocalStorage,
    getLocalStorage,
    apiRequest
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}