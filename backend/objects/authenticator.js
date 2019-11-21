const db = require('../db/queries/queries');
const bcrypt = require('bcrypt');

class Authenticator {

  authenticate(email, password) {
    return db.fetchUserByEmail(email)
      .then(user => {

        console.log(password);

        console.log(user);

        if (user && bcrypt.compareSync(password, user[0].password)) {
          return {
            id: user[0].id,
            email: user[0].email,
            username: user[0].username
          }
        } else {
          return false;
        }
      });
  }
}

module.exports = { Authenticator };
