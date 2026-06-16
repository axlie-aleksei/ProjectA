const registerForm = document.getElementById('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async event => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Ошибка: ${result.error || 'Что-то пошло не так'}`);
        return;
      }

      window.location.href = 'login.html';
    } catch (error) {
      alert('Не удалось связаться с сервером.');
    }
  });
}
