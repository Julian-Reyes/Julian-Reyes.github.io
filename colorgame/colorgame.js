
var squares = document.querySelectorAll(".square");
var colors = generateRandomColors(6);
var goal = pickcolor();
var rgbDisplay = document.querySelector("span");
rgbDisplay.textContent = goal;
var display = document.querySelector("#message");
var button = document.getElementById("reset");
var band = document.getElementById("band");
var bandState = false;
var hard = document.getElementById("hard");
var easy = document.getElementById("easy");
var isHard = true;

display.textContent = "this is a test";
display.style.color = "white";
hard.classList.add("selected");

//number of squares based on difficulty
band.style.backgroundColor = "cyan";

function difficulty(){
if (isHard){
  colors = generateRandomColors(6);
  game();
  console.log("isHard is true");
}
else{
  colors = generateRandomColors(3);
  game();
  console.log("isHard is false");
  for (i=3; i < squares.length;i++){
    squares[i].style.backgroundColor = "#232323";
  };
};
};

//reset button
button.addEventListener("click", function(){
  //make button say correct thing
  this.textContent = "New Colors";
  //make band original color
  band.style.backgroundColor = "lightblue";
  //make display message disappear
  display.style.color = "white";
  //generate new random colors
  //colors = generateRandomColors(6);
  difficulty();
  //pick color to be the goal
  goal = pickcolor();
  //change display color to match the goal color
  document.querySelector("span").textContent = goal;
  //assign new colors in the array to the squares on html
  for (i = 0; i < squares.length; i++){
    squares[i].style.backgroundColor = colors[i];
  };
});

//easy button
easy.addEventListener("click", function(){
  hard.classList.remove("selected");
  easy.classList.add("selected");
  isHard = false;
  difficulty();
  goal = pickcolor();
  document.querySelector("span").textContent = goal;
  display.style.color = "white";
  button.textContent = "New Colors";
  band.style.backgroundColor = "cyan";
});
//hard button
hard.addEventListener("click", function(){
  if (!isHard){
  easy.classList.remove("selected");
  hard.classList.add("selected");
  isHard = true;
  difficulty();
  goal = pickcolor();
  document.querySelector("span").textContent = goal;
  display.style.color = "white";
  button.textContent = "New Colors";
  band.style.backgroundColor = "turquoise";

  };

});

//logic for game for making the squares change color
function game(){
for (i = 0; i < colors.length; i++){
  squares[i].style.backgroundColor = colors[i];
  squares[i].addEventListener("click", function(){
    console.log(this.style.backgroundColor, goal);
    if ( this.style.backgroundColor != goal){
      display.style.color = "darkorange";
      display.textContent = "Try again!";
      this.style.background = "#232323";

    }
    else {
      display.style.color = "blue";
      display.textContent = "Correct!";
      band.style.background = goal;
      button.textContent = "Play Again?";
      for (i = 0; i < colors.length; i++){
        squares[i].style.backgroundColor = goal;
      };
    };
  });
};
};
game();


function pickcolor(){
  var random = Math.floor(Math.random() * colors.length );
  return colors[random];
  console.log(random);
};

function generateRandomColors(x){
  //make an array
  var arr = [];
  //add random colors to array
  //reapeat x times
  for (i = 0; i < x; i++){
    //get random color and push into array
    arr.push(randomColor());
  }
  //return that array
  return arr;

};

function randomColor(){
  //pick a "red" from 0-255
  var r = Math.floor( Math.random() * 256 );
  //pick a "green" from 0-255
  var g = Math.floor( Math.random() * 256 );
  //pick a "blue" from 0-255
  var b = Math.floor( Math.random() * 256 );

  return ("rgb(" + r + ", " + g + ", " + b + ")");
};



//
// squares[0].addEventListener("click", function(){
//   squares[0].style.backgroundColor = #232323;
// });
