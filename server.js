const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const serve = require('koa-static');

const app = new Koa();

// заранее созданные тикеты для тестирования и т. д.
const tickets = [
  {
    id: 1,
    name: 'Отсортировать книги по высоте',
    description: 'Переставить книги на книжной полке так, чтобы слева была самая высокая, а справа — самая низкая.',
    status: false,
    created: new Date(2021, 1, 8, 16, 29),
  },
  {
    id: 2,
    name: 'Прогладить кота',
    description: 'Найти кота, посадить к себе на колени или на диван и гладить хотя бы 10 минут.',
    status: false,
    created: new Date(2021, 1, 10, 11, 52),
  },
  {
    id: 3,
    name: 'Купить тапочницу',
    description: 'Найти в ассортименте IKEA или другого магазина подходящую тапочницу и сделать заказ.',
    status: false,
    created: new Date(2021, 1, 11, 14, 01),
  },
  {
    id: 4,
    name: 'Купить печенье',
    description: 'Купить хрустящее печенье с миндальной мукой и шоколадной крошкой. И СЪЕСТЬ.',
    status: false,
    created: new Date(2021, 1, 16, 19, 28),
  },
];

// ↓ Body Parsers // точно не знаю, что из этого реально нужно, но скопировал всё (:
app.use(
  koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true,
  })
);

app.use(serve('frontend'));

// ↓ CORS // скопировано из репозитория Нетологии без изменений
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*' }; // пусть так и будет

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

app.use(async (ctx, next) => {
  if (ctx.request.method !== 'GET') {
    return await next();
  }

  const { method } = ctx.request.query;

  switch (method) {
    case 'allTickets':
      const ticketsToSend = tickets.map(({ description, ...rest }) => rest); // крутая штука
      ctx.response.body = { success: true, data: ticketsToSend };
      return;
    case 'ticketById':
      const { id } = ctx.request.query;
      const ticket = tickets.find((elem) => elem.id == id);
      if (ticket) {
        ctx.response.body = { success: true, data: ticket };
      } else {
        ctx.response.body = { success: false, message: 'Тикет с таким id отсутствует' };
      }
      return;
  }
});

app.use(async (ctx, next) => {
  if (ctx.request.method !== 'PUT') {
    return await next();
  }

  const { method } = ctx.request.query;
  if (method === 'editTicket') {
    const { id } = ctx.request.query;
    const ticket = tickets.find((elem) => elem.id == id);

    if (!ticket) {
      ctx.response.body = { success: false, message: 'Тикет с таким id отсутствует' };
      return;
    }

    let editedTicket;
    try {
      editedTicket = JSON.parse(ctx.request.body);
    } catch (e) {
      ctx.response.body = { success: false, message: 'Некорректный JSON' };
      return;
    }

    for (const prop of ['name', 'description']) {
      ticket[prop] = editedTicket[prop];
    }

    ctx.response.body = { success: true, data: ticket };
    return;
  }
});

app.use(async (ctx) => {
  if (ctx.request.method !== 'POST') {
    return;
  }

  let requestBody = ctx.request.body;
  // проверка, не является ли объект пустым
  if (Object.keys(requestBody).length) {
    try {
      requestBody = JSON.parse(requestBody);
    } catch (e) {
      ctx.response.body = { success: false, message: 'Некорректный JSON' };
      return;
    }
  }

  const { method } = ctx.request.query;
  switch (method) {
    case 'createTicket':
      if (!validateNewTicket(requestBody)) {
        ctx.response.body = { success: false, message: 'Невалидный тикет' };
        return;
      }
      const { name, description, status } = requestBody;
      const newTicket = { name, description, status };
      const lastId = tickets.length ? tickets[tickets.length - 1].id : 0;
      newTicket.id = lastId + 1;
      newTicket.created = new Date();

      tickets.push(newTicket);
      ctx.response.body = { success: true, message: 'Тикет успешно добавлен', data: newTicket };
      return;

    case 'removeTicket':
      const { id } = ctx.request.query;
      const ticketIndex = tickets.findIndex((elem) => elem.id == id);
      if (ticketIndex !== -1) {
        tickets.splice(ticketIndex, 1);
        ctx.response.body = { success: true, message: 'Тикет успешно удалён' };
      } else {
        ctx.response.body = { success: false, message: 'Такого тикета не существует' };
      }
      return;
  }
});

// почему бы и не попробовать сделать примитивную валидацию
function validateNewTicket(ticket) {
  const { name, description, status, id } = ticket;
  return typeof name === 'string'
    && typeof description === 'string'
    && typeof status === 'boolean'
    && id === null;
}

const port = process.env.PORT || 7070;
http.createServer(app.callback()).listen(port);
