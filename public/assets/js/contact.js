/**
 * Contact Form Handling
 * Form validation, submission, and feedback
 */

(function() {
  'use strict';

  const form = document.getElementById('contact-form');
  const successMessage = document.getElementById('form-success');
  const errorMessage = document.getElementById('form-error');

  if (!form) return;

  // Form validation
  function validateForm() {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(function(field) {
      removeError(field);

      if (!field.value.trim()) {
        showError(field, 'This field is required');
        isValid = false;
      } else if (field.type === 'email' && !isValidEmail(field.value)) {
        showError(field, 'Please enter a valid email address');
        isValid = false;
      }
    });

    return isValid;
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function showError(field, message) {
    field.classList.add('error');

    const existingError = field.parentNode.querySelector('.form-error');
    if (existingError) {
      existingError.textContent = message;
    } else {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.textContent = message;
      field.parentNode.appendChild(errorDiv);
    }
  }

  function removeError(field) {
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }
  }

  // Check honeypot (spam protection)
  function isSpam() {
    const honeypot = form.querySelector('input[name="website"]');
    return honeypot && honeypot.value !== '';
  }

  // Handle form submission
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Check for spam
    if (isSpam()) {
      console.log('Spam detected');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get submit button and show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Sending...';
    submitBtn.disabled = true;

    // Hide previous messages
    successMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');

    // Prepare form data
    const formData = new FormData(form);

    // Remove honeypot field from submission
    formData.delete('website');

    // Submit form
    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(function(response) {
      if (response.ok) {
        // Success
        form.reset();
        successMessage.classList.remove('hidden');
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        throw new Error('Form submission failed');
      }
    })
    .catch(function(error) {
      console.error('Error:', error);
      errorMessage.textContent = 'Something went wrong. Please try again or email directly.';
      errorMessage.classList.remove('hidden');
    })
    .finally(function() {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    });
  });

  // Real-time validation on blur
  form.querySelectorAll('input, select, textarea').forEach(function(field) {
    field.addEventListener('blur', function() {
      if (field.hasAttribute('required')) {
        if (!field.value.trim()) {
          showError(field, 'This field is required');
        } else if (field.type === 'email' && !isValidEmail(field.value)) {
          showError(field, 'Please enter a valid email address');
        } else {
          removeError(field);
        }
      }
    });

    // Remove error on input
    field.addEventListener('input', function() {
      removeError(field);
    });
  });

})();
