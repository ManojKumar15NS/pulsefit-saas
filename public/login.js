document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('password');
  const usernameInput = document.getElementById('username');
  const fullnameInput = document.getElementById('fullname');
  const fullNameGroup = document.getElementById('fullNameGroup');
  
  const togglePasswordBtn = document.getElementById('togglePassword');
  const errorMsg = document.getElementById('errorMsg');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const btnSubmit = document.getElementById('btnSubmit');

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  let currentMode = 'login'; // login or register

  // TogglePassword Visibility
  togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.textContent = type === 'password' ? 'Show' : 'Hide';
  });

  // Switch to Sign In Tab
  tabLogin.addEventListener('click', () => {
    currentMode = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    
    fullNameGroup.style.display = 'none';
    fullnameInput.removeAttribute('required');
    
    formTitle.textContent = 'Trainer Login';
    formSubtitle.textContent = 'Secure admin login to access client data';
    btnSubmit.textContent = 'Secure Login';
    errorMsg.style.display = 'none';
  });

  // Switch to Sign Up Tab
  tabRegister.addEventListener('click', () => {
    currentMode = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    
    fullNameGroup.style.display = 'block';
    fullnameInput.setAttribute('required', 'true');
    
    formTitle.textContent = 'Create Account';
    formSubtitle.textContent = 'Sign up as a new trainer to manage clients';
    btnSubmit.textContent = 'Register & Enter';
    errorMsg.style.display = 'none';
  });

  // Handle Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    const username = usernameInput.value;
    const password = passwordInput.value;

    let url = '/api/login';
    let bodyData = { username, password };

    if (currentMode === 'register') {
      url = '/api/register';
      bodyData.fullname = fullnameInput.value;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        window.location.href = '/';
      } else {
        errorMsg.textContent = data.message || 'Authentication failed. Please try again.';
        errorMsg.style.display = 'block';
        
        // Shake animation reset
        errorMsg.style.animation = 'none';
        errorMsg.offsetHeight; /* trigger reflow */
        errorMsg.style.animation = null; 
      }
    } catch (err) {
      errorMsg.textContent = 'Server connection error. Please try again later.';
      errorMsg.style.display = 'block';
    }
  });
});
