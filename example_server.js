var http = require("http");

const PORT = 9000;

http
  .createServer(function(request, response) {
    response.write("Hello there!", "ascii");
    response.end();
  })
  .listen(PORT);

console.log("Server up and running on PORT " + PORT);
