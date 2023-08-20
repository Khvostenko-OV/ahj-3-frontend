const backendHost = 'http:/localhost:7070/'
const editForm = document.forms.editForm;
const createOpen = document.getElementById('createOpen');
const editClose = document.getElementById('editClose');
const deleteConfirm = document.getElementById('deleteConfirm');
const ticketList = document.querySelector('.ticket_list');

function addTicketElement(ticket) {
  if (ticket) {
    const div = document.createElement('div');
    div.className = 'ticket_row';
    div.dataset.id = ticket.id;
    const checked = ticket.status ? 'checked' : '';
    div.innerHTML = `
      <input type="hidden" class="ticket_id" name="id" value="${ticket.id}">
      <input type="checkbox" class="ticket_status" name="status" ${checked}>
      <div class="ticket_name">${ticket.name}</div>
      <div class="ticket_created">${ticket.created.replace('T', ' ').substring(0,19)}</div>
      <span class="ticket_edit">✎</span>
      <span class="ticket_delete">X</span>
    `;
  ticketList.appendChild(div);
  }
}

function editFormClose() {
  editForm.reset();
  editForm.className = 'edit_ticket_form';
}

createOpen.addEventListener('click', (e) => {
  editForm.querySelector('.form_header').textContent = 'Добавить тикет';
  document.getElementById('ticketId').value = -1;
  editForm.className = 'edit_ticket_form open';
});

editClose.addEventListener('click', (e) => {
  e.preventDefault();
  editFormClose();
});

editForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const xhr = new XMLHttpRequest();
  if (+document.getElementById('ticketId').value === -1) {
    xhr.open('POST', backendHost + '?method=createTicket', true);
  } else {
    xhr.open('POST', backendHost + `?method=patchTicket&id=${document.getElementById('ticketId').value}`, true);
  }
  xhr.send(new FormData(editForm));
  
  xhr.onerror = () => { 
    alert(`Server Error!`); 
    editFormClose();
    location.reload();
  }

  xhr.onload = () => {
    editFormClose();
    if (xhr.status === 201) {
      if (ticketList.firstChild.textContent.startsWith('Нет')) {
        ticketList.textContent = '';
      }
      addTicketElement(JSON.parse(xhr.response));
    } else if (xhr.status === 200) {
      const ticket = JSON.parse(xhr.response);
      const row = Array.from(ticketList.children).find(r => { return +r.querySelector('.ticket_id').value === ticket.id });
      row.querySelector('.ticket_name').textContent = ticket.name;
      if (row.querySelector('.ticket_description')) {
        row.querySelector('.ticket_description').textContent = ticket.description;
      }
    } else {
      alert(`Error - ${xhr.status}`);
      location.reload();
    }
  }
});

function getTicket(id) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', backendHost + `?method=ticketById&id=${id}`, false);
  xhr.send();

  if (xhr.status === 200) {
    return JSON.parse(xhr.response);
  } else return undefined;
}

function showTicket(id, row) {
  if (row.lastChild.className === 'ticket_description') {
    row.lastChild.remove();
    return;
  }
  const ticket = getTicket(id);
  if (!ticket) return;
  const div = document.createElement('div');
  div.className = 'ticket_description';
  div.textContent = ticket.description
  row.appendChild(div);
}

function changeTicket(id) {
  const ticket = getTicket(id);
  if (!ticket) return;
  editForm.querySelector('.form_header').textContent = 'Редактировать тикет';
  document.getElementById('ticketId').value = id;
  document.getElementById('ticketName').value = ticket.name;
  document.getElementById('ticketDescr').value = ticket.description;
  editForm.className = 'edit_ticket_form open';
}

function changeTicketStatus(id, box) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', backendHost + `?method=patchTicket&id=${id}`, true);
  const params = new URLSearchParams();
  params.append('status', box.checked);
  xhr.send(params);

  xhr.onerror = () => {
    location.reload();
  }

  xhr.onload = () => { 
    if (xhr.status !== 200) {
      box.checked = !box.checked;
    }
  }
}

function deleteTicket(id, row) {
  deleteConfirm.className = 'confirm open';
  document.getElementById('confirm_cancel').onclick = () => {
    deleteConfirm.className = 'confirm';
  }

  document.getElementById('confirm_ok').onclick = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', backendHost + `?method=deleteTicket&id=${id}`, true);
    xhr.send();

    xhr.onerror = () => {
      location.reload();
    }

    xhr.onload = () => { 
      deleteConfirm.className = 'confirm';
      row.remove();
      if (ticketList.children.length === 0) {
        ticketList.textContent = 'Нет тикетов';
      }
    }
  }
}

const xhr = new XMLHttpRequest();
xhr.open('GET', backendHost + '?method=allTickets', true);
xhr.responseType = 'json';
xhr.send();

xhr.onerror = () => { 
  ticketList.textContent = 'Ошибка загрузки';
}

xhr.onload = () => {
  if (xhr.status !== 200) {
      ticketList.textContent = `Ошибка загрузки - ${xhr.status}`;
      return;
  }
  const tickets = xhr.response;
  if (tickets.length === 0 || tickets.every(ticket => !ticket)) {
    ticketList.textContent = 'Нет тикетов';
    return;
  }
  ticketList.textContent = '';
  tickets.forEach(ticket => addTicketElement(ticket));
}

ticketList.addEventListener('click', (e) => {
  if (editForm.className === 'edit_ticket_form open' || deleteConfirm.className === 'confirm open') return;
  const row = e.target.parentElement;
  switch (e.target.className) {
    case 'ticket_status':
      changeTicketStatus(row.dataset.id, e.target);
      return;

    case 'ticket_name':
    case 'ticket_description':
      showTicket(row.dataset.id, row);
      return;

    case 'ticket_edit':
      changeTicket(row.dataset.id);
      return;

    case 'ticket_delete':
      deleteTicket(row.dataset.id, row);
      return;

    default:
      return;
    }
});
