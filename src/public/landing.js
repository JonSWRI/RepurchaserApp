
console.log("I'm on the client");

function AutoRefresh( t ) {
    console.log("Refreshing "+ new Date(Date.now()));
    setTimeout("location.reload(true);", t);
 }

 AutoRefresh(20000);