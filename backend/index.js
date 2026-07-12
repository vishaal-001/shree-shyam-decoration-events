const app = require('./app')
const config = require('./utils/config')

app.listen(config.PORT, () => {
  console.log(`server is listening at ${config.PORT} `)
})
