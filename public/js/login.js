const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Ошибка: ${result.error || 'Не удалось войти'}`);
        return;
      }

      localStorage.setItem('authToken', result.token);
      localStorage.setItem('username', result.username);

      window.location.href = 'index.html';
    } catch (error) {
      alert('Не удалось связаться с сервером.');
    }
  });
}
