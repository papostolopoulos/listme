// Update with your config settings.

module.exports = {

  development: {
    client: 'postgres',
    connection: 'postres://localhost/todo'
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL + '?ssl=true'
  }
};
