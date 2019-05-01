
const loginView = document.getElementById('login');
const chatView = document.getElementById('chat');

const loginForm = document.forms['login'];
const usernameField = loginForm.elements['username'];
const avatarField = loginForm.elements['avatar'];

const messageForm = document.forms['chat-form'];
const messageField = messageForm.elements['message'];
const messages = document.getElementById('messages');

function createElement(tagName, attrs) {
  const element = document.createElement(tagName);
  Object.assign(element, attrs);
  return element;
}

loginForm.onsubmit = function(event) {
  event.preventDefault();

  usernameField.type = 'hidden';
  avatarField.type = 'hidden';
  usernameField.removeAttribute('autofocus');
  messageForm.appendChild(usernameField);
  messageForm.appendChild(avatarField);
  loginView.classList.toggle('active');
  chatView.classList.toggle('active');
  messageField.focus();
  subscribe(onSubscribe);
}

messageForm.onsubmit = function(event) {
  event.preventDefault();
  const targetForm = event.target;
  const xhr = new XMLHttpRequest();
  xhr.open(targetForm.method, targetForm.action);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.send(JSON.stringify({
    message: messageField.value,
    username: usernameField.value,
    avatar: avatarField.value
  }));
  messageField.value = '';
  messageField.focus();
}

function onSubscribe(data) {
  const message = createElement('li', {
    className: 'message',
    innerHTML: `
      <img />
      <div class="content">
        <div class="username"></div>
        <div class="text"></div>
      </div>
    `
  });

  messages.appendChild(message);

  const image = message.querySelector('img');
  image.src = data.avatar;
  image.alt = data.username;
  const username = message.querySelector('.username');
  username.textContent = data.username;
  const text = message.querySelector('.text');
  text.textContent = data.message;
}

function subscribe(onSuccess) {
  const xhr = new XMLHttpRequest();

  xhr.open('POST', `/subscribe`);

  xhr.onload = function() {
    if(xhr.status != 200) return this.onerror();
    try {
      const data = JSON.parse(this.responseText);
      onSuccess(data);
      subscribe(onSuccess);
    } catch (error) {
      this.onerror(error);
    }
  };

  xhr.onerror = xhr.onabort = function() {
    setTimeout(subscribe, 1000, onSuccess);
  };

  xhr.send();
}