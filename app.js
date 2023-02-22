const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const responseTodoDBObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
  };
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasSearchProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

app.get("/todos/", async (request, response) => {
  let getTodosQuery = " ";
  let getTodosQueryResponse = null;
  const { search_q = "", priority, status } = request.query;

  switch (true) {
    case hasStatusProperty(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTodosQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
          status = '${status}';`;
        getTodosQueryResponse = await db.all(getTodosQuery);
        response.send(
          getTodosQueryResponse.map((eachItem) =>
            responseTodoDBObject(eachItem)
          )
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case hasPriorityProperty(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        getTodosQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
          priority = '${priority}';`;
        getTodosQueryResponse = await db.all(getTodosQuery);
        response.send(
          getTodosQueryResponse.map((eachItem) =>
            responseTodoDBObject(eachItem)
          )
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasPriorityAndStatusProperties(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodosQuery = `
          SELECT
            *
          FROM
            todo 
          WHERE
            status = '${status}'
            AND priority = '${priority}';`;
          getTodosQueryResponse = await db.all(getTodosQuery);
          response.send(
            getTodosQueryResponse.map((eachItem) =>
              responseTodoDBObject(eachItem)
            )
          );
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasSearchProperty(request.query):
      getTodosQuery = `
      SELECT 
        *
      FROM
        todo
      WHERE 
        todo LIKE '%${search_q}%';`;
      getTodosQueryResponse = await db.all(getTodosQuery);
      response.send(
        getTodosQueryResponse.map((eachItem) => responseTodoDBObject(eachItem))
      );
      break;

    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
      getTodosQueryResponse = await db.all(getTodosQuery);
      response.send(
        getTodosQueryResponse.map((eachItem) => responseTodoDBObject(eachItem))
      );
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getToDoQuery = `
  SELECT 
    * 
  FROM 
    todo 
  WHERE 
    id = ${todoId};`;
  getToDoQueryResponse = await db.get(getToDoQuery);
  response.send(responseTodoDBObject(getToDoQueryResponse));
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status} = request.body;
  if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      const postTodoQuery = `
          INSERT INTO
            todo (id, todo, priority, status)
          VALUES
            (
              ${id}, '${todo}', '${priority}', '${status}'
            );`;
      await db.run(postTodoQuery);

      response.send("Todo Successfully Added");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  console.log(requestBody);
  const previousTodoQuery = `
  SELECT 
    * 
  FROM 
    todo 
  WHERE 
    id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);
  const { todo, priority, status } = request.body;

  let updateTodoQuery;

  switch (true) {
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTodoQuery = `
        UPDATE 
          todo 
        SET 
          status = '${status}' 
        WHERE 
          id = ${todoId};`;
        await db.run(updateTodoQuery);
        response.send(`Status Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case requestBody.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateTodoQuery = `
        UPDATE 
          todo 
        SET 
          priority = '${priority}' 
        WHERE 
          id = ${todoId};`;
        await db.run(updateTodoQuery);
        response.send(`Priority Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case requestBody.todo !== undefined:
      updateTodoQuery = `
      UPDATE 
        todo 
      SET 
        todo = '${todo}' 
      WHERE 
        id = ${todoId};`;
      await db.run(updateTodoQuery);
      response.send(`Todo Updated`);
      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
