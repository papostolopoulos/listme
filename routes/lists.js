var express = require('express');
var router = express.Router();
var knex = require('../db/knex');
var bodyParser = require('body-parser');


/*
--------------------------
ROUTES FOR LISTS
--------------------------
*/

/*GET LISTS OF THE USER*/
router.get('/:email', function(req, res, next) {
  console.log(req.params);
  console.log(req.session.user);
  if (req.params.email !== req.session.user) { //The user hand typed the url for the lists but is not logged in as this user
    res.render('error', {
      message: "Forbidden access",
      status: 403,
      description: "You need to be logged in as this user in order to view the related lists.",
      user: req.session.user || "guest"
    });
  }
  else {
    var userEmail = req.params.email;
    knex
    .select('list.name', 'list.id', 'users.id', 'users.email')
    .table('list')
    .innerJoin('users', 'list.user_id', 'users.id')
    .where({email: userEmail})
    .returning('*')
    .then(function (listTitles) {
      console.log("router.GET /:email - display all the lists of the user:", listTitles);
      res.render('lists',{
        listTitles: listTitles,
        email: listTitles.email,
        user: req.session.user || 'guest'
      });
    });
  }
});


//POST A NEW LIST
router.post('/addList', function (req, res, next) {

  knex('users')
  .select()
  .where({email: req.session.user})
  .returning('*')
  .then(function(users){
    var user = users[0];

    knex('list')
    .insert({
      user_id: user.id,
      name: req.body.inputAddList
    })
    .then(function () {
      res.redirect('/lists/' + req.session.user);
    })

  });
});


//DELETE THE LIST
router.delete('/deleteList', function (req, res, next) {
  knex('list')
  .select()
  .where({name: req.body.inputDeleteListName})
  .del()
  .then(function () {
    res.redirect('/lists/' + req.session.user);
  })
})


//UPDATE THE LIST'S NAME
router.put('/editListName', function (req, res, next) {
  console.log(req.body);
  knex('list')
  .select()
  .where({name: req.body.originalListName})
  .update({name: req.body.inputEditListName})
  .then(function () {
    res.status(200);
  })

})





/*
--------------------------
ROUTES FOR TASKS
--------------------------
*/

var reqParams;
var recentListId;
// ROUTER.GET - DISPLAY A PARTICULAR LIST'S TASKS
router.get('/:email/:listName', function (req, res, next) {
  console.log(req.params);
  reqParams = req.params;
  if (req.params.email !== req.session.user) {
    res.render('error', {
      message: "Forbidden access",
      status: 403,
      description: "You need to be logged in as a different user in order to view the tasks included in this list."
    });
  }
  else {
    knex
    .select('list.name', 'list_task.list_id', 'list_task.task_id', 'list_task.id', 'task.todo', 'users.email', 'task.completed')
    .table('list')
    .innerJoin('list_task', 'list_task.list_id', 'list.id')
    .innerJoin('task', 'task.id', 'list_task.task_id')
    .innerJoin('users', 'users.id', 'list.user_id')
    .where({name: req.params.listName})
    .returning('*')
    .then(function (listedTasks) {
      console.log("LIST TASKS FROM THE ROUTER.GET", listedTasks);
      if (listedTasks.length !== 0) {
        recentListId = listedTasks[0].list_id;
        console.log(listedTasks.todo);
        res.render('list', {
          name: req.params.listName,
          listedTasks: listedTasks,
          id: listedTasks[0].list_id,
          user: req.session.user || 'guest'
        })
      }
      else {
        knex('list')
        .select()
        .where({name: req.params.listName})
        .returning('*')
        .then(function (listedTasks) {
          console.log(listedTasks);
          res.render('list', {
            name: reqParams.listName,
            id: reqParams.id,
            user: req.session.user
          });
        });
      }
    });

  }
});


//POST A NEW TASK IN LIST
router.post('/addTask', function (req, res, next) {
  console.log(req.body);
  if (req.body.todo.trim() === "") {
    res.render('error', {
      message: "Invalid entry",
      status: "403",
      description: "You need to enter some text in order for a new task to be saved in the database",
      user: req.session.user
    })
  }
  else {
    if (!req.body.list_id) {
      console.log("in the if statement. Need to knex it");
      knex('list')
      .select()
      .where({name: reqParams.listName})
      .returning('')
      .then(function(lists) {
        console.log(lists);
        var list = lists[0];
        recentListId = list.id;
        knex('task')
        .insert({
          todo: req.body.todo,
          completed: false
        })
        .returning('*')
        .then(function(insertedTasks) {
          var insertedTask = insertedTasks[0];
          knex('list_task')
          .insert({
            task_id: insertedTask.id,
            list_id: recentListId
          })
          .returning('*')
          .then(function () {
            res.redirect('/lists/' + req.body.email + "/" + reqParams.listName);
          });
        });
      });
    }
    else {
      console.log("in tbe else statement");
      knex('task')
      .insert({
        todo: req.body.todo,
        completed: false
      })
      .returning('*')
      .then(function(insertedTasks) {
        var insertedTask = insertedTasks[0]
        console.log(req.body);
        console.log("req.body.list_id:", req.body.list_id);
        console.log("recentListId", recentListId);
        knex('list_task')
        .insert({
          task_id: insertedTask.id,
          list_id: req.body.list_id
        })
        .returning('*')
        .then(function() {
          res.redirect('/lists/' + req.body.email + "/" + reqParams.listName);
        });
      });
    }
  }
});


//UPDATE THE STATUS OF A TASK
router.put('/updateTask', function(req, res, next){
  //go to list task with the req.body.id and get the list_task.list_id
  //run the knex in the task table where id is list_task.list_id
  //run the if statement
  console.log(req.body);
  knex('list_task')
  .where({id: req.body.id})
  .returning('*')
  .then(function (listTasks) {
    console.log("This comes from the put", listTasks);
    var listTask = listTasks[0];
    knex("task")
    .select()
    .where({id: listTask.task_id})
    .returning('*')
    .then(function(tasks) {
      var task = tasks[0];
      if (task.completed === true) {
        console.log("in the if statement");
        knex('task')
        .where({id: task.id})
        .update({completed: false})
        .returning('*')
        .then(function (completedTasks) {
          console.log("variable reqParams", reqParams);
          res.redirect('/lists/' + req.session.user + "/" + reqParams.listName);
        })
      }
      else {
        console.log("in the else statement");
        knex('task')
        .where({id: task.id})
        .update({completed: true})
        .returning('*')
        .then(function (completedTasks) {
          console.log("variable reqParams", reqParams);
          res.redirect('/lists/' + req.session.user + "/" + reqParams.listName);
        });
      }
    });
  });
});



//DELETE THE TASK
var listIdFromListTasks;
router.delete('/deleteTask', function (req, res, next) {


  knex('list_task')
  .where('task_id', req.body.task_id)
  .returning('*')
  .then(function (listTasks) {
    var listTask = listTasks[0];
    listIdFromListTasks = listTask.list_id;

  })
  .then(function () {
    knex('list_task')
    .where('task_id', req.body.task_id)
    .del()
  })
  .then(function () {
    knex('task')
    .where('id', req.body.task_id)
    .del()
    .then(function (listIdFromListTasks) {
      console.log("***********************", listIdFromListTasks);
      knex
      .select('list.name', 'list_task.list_id', 'list_task.task_id', 'list_task.id', 'task.todo', 'users.email', 'task.completed')
      .table('list')
      .innerJoin('list_task', 'list_task.list_id', 'list.id')
      .innerJoin('task', 'task.id', 'list_task.task_id')
      .innerJoin('users', 'users.id', 'list.user_id')
      .where({'list.id': listIdFromListTasks})
      .returning('*')
      .then(function (listedTasks) {
        res.redirect('/lists/' + req.session.user + "/" + reqParams.listName);
      });
      console.log("the entry was deleted");
    })
  })


})








module.exports = router;
