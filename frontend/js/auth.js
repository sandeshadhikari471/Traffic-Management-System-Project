// Auth page JS - handles login and registration forms
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (HGH.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      HGH.setLoading(btn, true, 'Logging in...');

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const result = await HGH.apiCall('/auth/login', 'POST', { email, password });

        if (result.ok) {
          HGH.setAuth(result.data.token, result.data.user);
          HGH.showToast(result.data.message, 'success');

          const redirect = new URLSearchParams(window.location.search).get('redirect');
          setTimeout(() => {
            window.location.href = redirect || (result.data.user.role === 'admin' ? 'admin.html' : 'dashboard.html');
          }, 1000);
        } else {
          HGH.showToast(result.data.message, 'error');
          HGH.setLoading(btn, false);
        }
      } catch (err) {
        HGH.showToast('Network error. Please check if server is running.', 'error');
        HGH.setLoading(btn, false);
      }
    });
  }

  // Handle Register
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (password !== confirmPassword) {
        HGH.showToast('Passwords do not match!', 'error');
        return;
      }

      HGH.setLoading(btn, true, 'Creating Account...');

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();

      try {
        const result = await HGH.apiCall('/auth/register', 'POST', { name, email, password, phone, address });

        if (result.ok) {
          HGH.setAuth(result.data.token, result.data.user);
          HGH.showToast(result.data.message, 'success');
          setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } else {
          HGH.showToast(result.data.message, 'error');
          HGH.setLoading(btn, false);
        }
      } catch (err) {
        HGH.showToast('Network error. Please check if server is running.', 'error');
        HGH.setLoading(btn, false);
      }
    });
  }

  // Password toggle
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // Password strength indicator
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('password-strength');
  if (passwordInput && strengthBar) {
    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      let strength = 0;
      if (val.length >= 6) strength++;
      if (val.length >= 10) strength++;
      if (/[A-Z]/.test(val)) strength++;
      if (/[0-9]/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val)) strength++;

      const levels = ['', 'very-weak', 'weak', 'fair', 'strong', 'very-strong'];
      strengthBar.className = 'strength-bar ' + (levels[strength] || '');
    });
  }
});
