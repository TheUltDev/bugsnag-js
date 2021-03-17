const Bugsnag = require('@bugsnag/node')
const bugsnagKoa = require('@bugsnag/plugin-koa')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser');

Bugsnag.start({
  apiKey: process.env.BUGSNAG_API_KEY,
  endpoints: {
    notify: process.env.BUGSNAG_NOTIFY_ENDPOINT,
    sessions: process.env.BUGSNAG_SESSIONS_ENDPOINT
  },
  plugins: [bugsnagKoa]
})


const middleware = Bugsnag.getPlugin('koa')

const app = new Koa()

// If the server hasn't started sending something within 2 seconds
// it probably won't. So end the request and hurry the failing test
// along.
app.use(async (ctx, next) => {
  setTimeout(function () {
    if (!ctx.response.headerSent) ctx.response.status = 500
  }, 2000)
  await next()
})

app.use(async (ctx, next) => {
  if (ctx.path === '/error-before-handler') {
    throw new Error('nope')
  } else {
    await next()
  }
})

app.use(middleware.requestHandler)

app.use(bodyParser());

const erroneous = () => new Promise((resolve, reject) => reject(new Error('async noooop')))

app.use(async (ctx, next) => {
  if (ctx.path === '/') {
    ctx.body = 'ok'
  } else if (ctx.path === '/err') {
    throw new Error('noooop')
  } else if (ctx.path === '/async-err') {
    await erroneous()
  } else if (ctx.path === '/ctx-throw') {
    ctx.throw(500, 'thrown')
  } else if (ctx.path === '/ctx-throw-400') {
    ctx.throw(400, 'thrown')
  } else if (ctx.path === '/throw-non-error') {
    throw 'error' // eslint-disable-line
  } else if (ctx.path === '/handled') {
    ctx.bugsnag.notify(new Error('handled'))
    await next()
  } else if (ctx.path === '/bodytest') {
    throw new Error('request body')
  } else {
    await next()
  }
})

app.on('error', middleware.errorHandler)

app.listen(80)
