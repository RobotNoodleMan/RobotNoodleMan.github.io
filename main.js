"use script";

window.addEventListener('load', main);

/*
*   n is rows, m is columns
*/

  //Pavol's code section,
let MSGame = (function(){

    // private constants
    const STATE_HIDDEN = "hidden";
    const STATE_SHOWN = "shown";
    const STATE_MARKED = "marked";
  
    function array2d( nrows, ncols, val) {
      const res = [];
      for( let row = 0 ; row < nrows ; row ++) {
        res[row] = [];
        for( let col = 0 ; col < ncols ; col ++)
          res[row][col] = val(row,col);
      }
      return res;
    }
  
    // returns random integer in range [min, max]
    function rndInt(min, max) {
      [min,max] = [Math.ceil(min), Math.floor(max)]
      return min + Math.floor(Math.random() * (max - min + 1));
    }
  
    class _MSGame {
      constructor() {
        this.init(8,10,10); // easy
      }
  
      validCoord(row, col) {
        return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
      }
  
      init(nrows, ncols, nmines) {
        this.nrows = nrows;
        this.ncols = ncols;
        this.nmines = nmines;
        this.nmarked = 0;
        this.nuncovered = 0;
        this.exploded = false;
        // create an array
        this.arr = array2d(
          nrows, ncols,
          () => ({mine: false, state: STATE_HIDDEN, count: 0}));
      }
  
      count(row,col) {
        const c = (r,c) =>
              (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
        let res = 0;
        for( let dr = -1 ; dr <= 1 ; dr ++ )
          for( let dc = -1 ; dc <= 1 ; dc ++ )
            res += c(row+dr,col+dc);
        return res;
      }
      sprinkleMines(row, col) {
          // prepare a list of allowed coordinates for mine placement
        let allowed = [];
        for(let r = 0 ; r < this.nrows ; r ++ ) {
          for( let c = 0 ; c < this.ncols ; c ++ ) {
            if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
              allowed.push([r,c]);
          }
        }
        this.nmines = Math.min(this.nmines, allowed.length);
        for( let i = 0 ; i < this.nmines ; i ++ ) {
          let j = rndInt(i, allowed.length-1);
          [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
          let [r,c] = allowed[i];
          this.arr[r][c].mine = true;
        }
        // erase any marks (in case user placed them) and update counts
        for(let r = 0 ; r < this.nrows ; r ++ ) {
          for( let c = 0 ; c < this.ncols ; c ++ ) {
            if(this.arr[r][c].state == STATE_MARKED)
              this.arr[r][c].state = STATE_HIDDEN;
            this.arr[r][c].count = this.count(r,c);
          }
        }
        let mines = []; let counts = [];
        for(let row = 0 ; row < this.nrows ; row ++ ) {
          let s = "";
          for( let col = 0 ; col < this.ncols ; col ++ ) {
            s += this.arr[row][col].mine ? "B" : ".";
          }
          s += "  |  ";
          for( let col = 0 ; col < this.ncols ; col ++ ) {
            s += this.arr[row][col].count.toString();
          }
          mines[row] = s;
        }
        console.log("Mines and counts after sprinkling:");
        console.log(mines.join("\n"), "\n");
      }
      // puts a flag on a cell
      // this is the 'right-click' or 'long-tap' functionality
      uncover(row, col) {
        console.log("uncover", row, col);
        // if coordinates invalid, refuse this request
        if( ! this.validCoord(row,col)) return false;
        // if this is the very first move, populate the mines, but make
        // sure the current cell does not get a mine
        if( this.nuncovered === 0)
          this.sprinkleMines(row, col);
        // if cell is not hidden, ignore this move
        if( this.arr[row][col].state !== STATE_HIDDEN) return false;
        // floodfill all 0-count cells
        const ff = (r,c) => {
          if( ! this.validCoord(r,c)) return;
          if( this.arr[r][c].state !== STATE_HIDDEN) return;
          this.arr[r][c].state = STATE_SHOWN;
          this.nuncovered ++;
          if( this.arr[r][c].count !== 0) return;
          ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
          ff(r  ,c-1);         ;ff(r  ,c+1);
          ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
        };
        ff(row,col);
        // have we hit a mine?
        if( this.arr[row][col].mine) {
          this.exploded = true;
        }
        return true;
      }
      // uncovers a cell at a given coordinate
      // this is the 'left-click' functionality
      mark(row, col) {
        console.log("mark", row, col);
        // if coordinates invalid, refuse this request
        if( ! this.validCoord(row,col)) return false;
        // if cell already uncovered, refuse this
        console.log("marking previous state=", this.arr[row][col].state);
        if( this.arr[row][col].state === STATE_SHOWN) return false;
        // accept the move and flip the marked status
        this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
        this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
          STATE_HIDDEN : STATE_MARKED;
        return true;
      }
      // returns array of strings representing the rendering of the board
      //      "H" = hidden cell - no bomb
      //      "F" = hidden cell with a mark / flag
      //      "M" = uncovered mine (game should be over now)
      // '0'..'9' = number of mines in adjacent cells
      getRendering() {
        const res = [];
        for( let row = 0 ; row < this.nrows ; row ++) {
          let s = "";
          for( let col = 0 ; col < this.ncols ; col ++ ) {
            let a = this.arr[row][col];
            if( this.exploded && a.mine) s += "M";
            else if( a.state === STATE_HIDDEN) s += "H";
            else if( a.state === STATE_MARKED) s += "F";
            else if( a.mine) s += "M";
            else s += a.count.toString();
          }
          res[row] = s;
        }
        return res;
      }
      getStatus() {
        let done = this.exploded ||
            this.nuncovered === this.nrows * this.ncols - this.nmines;
        return {
          done: done,
          exploded: this.exploded,
          nrows: this.nrows,
          ncols: this.ncols,
          nmarked: this.nmarked,
          nuncovered: this.nuncovered,
          nmines: this.nmines
        }
      }
    }
  
    return _MSGame;
  
  })();
  
//Added on interface using the MSGame to build a grid
class Controller
{   //constructor simply sets the game and the grid in use
    constructor(game) 
    {
        this.game = game;
       // this.grid = document.getElementById("grid");
        this.startGrid = document.getElementById("grid");
    }
    
    prepare_dom(n,m,mine) 
    {
        this.grid = this.startGrid;
        this.interval = null;
        this.startTimer = 0;
        this.mcell = null;
        this.time = 0;
        this.timer = null;
        this.grid.innerHTML = ""
        this.mrows = n;
        this.mcols = m;
        this.mines = mine;
        this.game.init(n,m,mine);
        let cellColor = null;
        this.setButtons();
        var textnode = document.createTextNode(mine);
        document.getElementById("mines").appendChild(textnode);
        for( let i = 0 ; i < this.mrows ; i ++) 
        {
            let row = this.grid.insertRow(i);
            for(let j = 0; j<this.mcols; j++)
            {
                let cell = row.insertCell(j);
                let self = this;
                if(i%2 === 0)
                {
                  if(j%2 !== 0)
                    cell.style.backgroundColor = "#9becad";
                  else 
                    cell.style.backgroundColor = "#5ad474";
                }
                if(i%2 !== 0)
                {
                  if(j%2 === 0)
                    cell.style.backgroundColor = "#9becad";
                  else 
                    cell.style.backgroundColor = "#5ad474";
                }
                this.mcell = cell;
                // standard click for mouse and touch
                cell.addEventListener("click", function(event){
                        self.cellClicked(cell)
                });
                //mouse/desktop right click
                cell.addEventListener("contextmenu", function(event){
                      self.cellMarked(cell)
                      window.event.returnValue = false;
                });
                //mobile long tap
                cell.addEventListener("touchstart",function(){self.touchstart(cell)},false);
                cell.addEventListener("touchend",function(){self.touchend()},false);
                

            }
        }
    }
    reset_dom(n,m,mine)
    {
        clearInterval(this.interval);
        document.getElementById("time").innerHTML= "Timer:";
        this.mrows = n;
        this.mcols = m;
        this.mines = mine;
        document.getElementById("mines").innerHTML = "Mines:";
        // var x = document.createElement("TABLE");
        // x.setAttribute("id", "grid");
        // document.body.appendChild(x);

    }

    setButtons()
    {
      let b1 = document.getElementById("button1");
      let b2 = document.getElementById("button2");
      let b3 = document.getElementById("button3");
      let self = this;
      b1.addEventListener("click", function(event){
        self.mrows = 8;
        self.mcols = 10;
        self.mines = 10;
        self.reset_dom(self.mrows,self.mcols,self.mines);
        self.prepare_dom(self.mrows,self.mcols,self.mines);
      });
      b2.addEventListener("click", function(event){
        self.mrows = 14;
        self.mcols = 18;
        self.mines = 40;
        self.reset_dom(self.mrows,self.mcols,self.mines);
        self.prepare_dom(self.mrows,self.mcols,self.mines);
      });
      b3.addEventListener("click", function(event){
        self.reset_dom(self.mrows,self.mcols,self.mines);
        self.prepare_dom(self.mrows,self.mcols,self.mines);
      });
    }

    gridUpdate()
   {
     let time = 0;
     if(this.startTimer ===0)
     {
       this.startTimer = 1;
      this.interval = setInterval( function(){
        time++;
        document.getElementById("time").innerHTML= "Timer: " + time;
    }, 1000);
     }
    let condition = null;
    let gameState = this.game.getStatus();  
    let gameMap = [];
    gameMap = this.game.getRendering();
    console.log(gameMap.join("\n"));
    console.log(gameState.nmines);
    let textnode = document.createTextNode(gameState.nmines-gameState.nmarked);
    if(gameState.nmines<gameState.nmarked)
        textnode = document.createTextNode(0);
    document.getElementById("mines").innerHTML = "Mines:"
    document.getElementById("mines").appendChild(textnode);
    if(gameState.done)
    {
           if(gameState.exploded)
           {
                for( let i = 0 ; i < this.mrows ; i ++) 
                {
                    for(let j = 0; j<this.mcols; j++)
                    {
                        if(gameMap[i][j] === "M")
                        {
                            document.getElementById('grid').rows[i].cells[j].innerHTML = "B";  
                            document.getElementById('grid').rows[i].cells[j].style.backgroundColor = "#bd1c1c"; 
                        }
                            
                    }
                    
                }
                alert("You lose. Press reset button to reset the game!");
            }
            else
              alert("You win! Press reset button to reset the game!");
           

    }
    else
    {
        for( let i = 0 ; i < this.mrows ; i ++) 
        {
                for(let j = 0; j<this.mcols; j++)
                {
                    if (gameMap[i][j] ==="F")
                    {
                      document.getElementById('grid').rows[i].cells[j].innerHTML = gameMap[i][j];
                    }
                    else if(gameMap[i][j] === "0")
                    {
                        document.getElementById('grid').rows[i].cells[j].style.backgroundColor = "#85998a";
                       // document.getElementById('grid').rows[i].cell s[j].innerHTML = gameMap[i][j];
                    }
                    else if (gameMap[i][j] !== "H" && gameMap[i][j]!== "M")
                    {
                        document.getElementById('grid').rows[i].cells[j].style.backgroundColor = "#85998a";
                        document.getElementById('grid').rows[i].cells[j].innerHTML = gameMap[i][j];
                    }
                    else if (gameMap[i][j] == "H")
                    {
                      document.getElementById('grid').rows[i].cells[j].innerHTML = "";
                    }
                }
        }
    }

   }

   //For just clicking on a grid tile
   cellClicked(cell)
   {
        let grid = document.getElementById("grid");
        let trow = cell.cellIndex;
        let tcol = cell.parentNode.rowIndex;
        this.game.uncover(tcol,trow);
        this.gridUpdate();
   }
  //For long click to add flags
   cellMarked(cell)
   {
    let grid = document.getElementById("grid");
    let row = cell.cellIndex;
    let col = cell.parentNode.rowIndex;    
    this.game.mark(col,row);
    this.gridUpdate();
   }

   touchstart(cell)
   {
     let self = this;
    this.timer = setTimeout(function() { self.cellMarked(cell) }); 
    return false

   }
   touchend()
   {
      if(this.timer)
      {
        clearTimeout(this.timer);
      }
   }
   

}



function main()
{
    let game = new MSGame();
    let control = new Controller(game);
    control.prepare_dom(8,10,10); 

}