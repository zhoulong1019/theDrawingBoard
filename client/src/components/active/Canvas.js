import React, { useState, useEffect, useRef, useReducer } from 'react';
import './Canvas.scss';

const SET_X = "SET_X";
const SET_Y = "SET_Y";
const SET_DRAG = "SET_DRAG";
const SET_PIXEL = "SET_PIXEL";
const SET_CTX = "SET_CTX";
const REDRAW = "REDRAW";

function reducer(state, action) {
  switch (action.type) {
    case SET_PIXEL: {
      if (state.pixelArrays[action.payload.user]) {
        return {
          ...state,
          pixelArrays: {
            ...state.pixelArrays,
            [action.payload.user]: [...state.pixelArrays[action.payload.user], action.payload.pixel]
          }
        }
      } else {
        return {
          ...state,
          pixelArrays: {
            ...state.pixelArrays,
            [action.payload.user]: [action.payload.pixel]
          }
        }
      }
    }
    case SET_CTX:
      return { ...state, ctx: action.payload };
    case REDRAW: {
      state.ctx.clearRect(0, 0, state.ctx.canvas.width, state.ctx.canvas.height); // Clears the drawCanvas
      console.log("1- state", state)
      //Sets the properties (change this part for custom pixel colors)
      state.ctx.lineJoin = "round";
      state.ctx.lineWidth = 2;
      state.ctx.strokeStyle = '#00000';

      for (let user in state.pixelArrays) {

        let pixels = state.pixelArrays[user]
        for (let i in pixels) {

          state.ctx.beginPath(); //start drawing a single line
          if (pixels[i].dragging && i) { //if we're in dragging mode, use the last pixel
            state.ctx.moveTo(pixels[i - 1].x, pixels[i - 1].y);
          } else { //else use the current pixel, offset by 1px to the left
            state.ctx.moveTo(pixels[i].x - 1, pixels[i].y);
          }
          state.ctx.lineTo(pixels[i].x, pixels[i].y);//draw a line from point mentioned above to the current pixel
          state.ctx.closePath();//end the line
          state.ctx.stroke();//draw the line
        }
      }
      /* Old way (single array) Remove once we confirm multiuser array method works
       for (let i = 0; i < state.clickX.length; i++) {
          state.ctx.beginPath();
          if (state.clickDrag[i] && i) {
            state.ctx.moveTo(state.clickX[i - 1], state.clickY[i - 1]);
          } else {
            state.ctx.moveTo(state.clickX[i] - 1, state.clickY[i]);
          }
          state.ctx.lineTo(state.clickX[i], state.clickY[i]);
          state.ctx.closePath();
          state.ctx.stroke();
        }
      */

      return { ...state };
    }
    default:
      throw new Error();
  }
}

export default function Canvas({ imageEl, isLoaded, socket, socketOpen, user, meetingId }) {

  //State for drawing canvas:
  const drawCanvasRef = useRef(null);
  let [paint, setPaint] = useState(false);
  const myCode = useRef(Math.floor(Math.random() * 1000), [])

  const [drawingState, dispatch] = useReducer(reducer, {
    pixelArrays: {
      [myCode]: []
    },
    ctx: undefined
  });


  //State for image canvas:
  const imageCanvasRef = useRef(null);
  let [imageCtx, setImageCtx] = useState();

  useEffect(() => {
    if (socketOpen) {
      // socket.emit('fetchMeetings', { username: user.username, meetingStatus: 'scheduled' });
      socket.on('drawClick', data => {
        // console.log(data.pixel.x);
        console.log(user);
        console.log(data.code);
        if (myCode.current !== data.code) {
          dispatch({ type: SET_PIXEL, payload: { user: data.user, pixel: data.pixel } });
          dispatch({ type: REDRAW });
        }
      });
      return () => {
        socket.off('drawClick');
      };
    }
  }, [socket, socketOpen, user.username]);

  //Sets the image canvas after it has loaded (and upon any changes in image)
  useEffect(() => {
    imageCanvasRef.current.width = window.innerWidth;
    imageCanvasRef.current.height = window.innerHeight;
    setImageCtx(prev => {
      prev = imageCanvasRef.current.getContext('2d')
      prev.drawImage(imageEl, 0, 0, window.innerWidth, window.innerHeight);
    });
  }, [imageCtx, isLoaded, imageEl]);

  //Loads the initial drawing canvas
  useEffect(() => {
    drawCanvasRef.current.width = window.innerWidth;
    drawCanvasRef.current.height = window.innerHeight;
    const newCtx = drawCanvasRef.current.getContext('2d')
    dispatch({
      type: SET_CTX,
      payload: newCtx
    });
  }, []);

  const addClick = (x, y, dragging) => {
    //Uncomment this if you want the user to
    let pixel = {
      x: x,
      y: y,
      dragging: dragging
    };
    dispatch({ type: SET_PIXEL, payload: { user: myCode.current, pixel: pixel } });
    dispatch({ type: REDRAW });
  };


  const handleMouseDown = e => {
    let mouseX = e.pageX - drawCanvasRef.current.offsetLeft;
    let mouseY = e.pageY - drawCanvasRef.current.offsetTop;
    setPaint(true);
    addClick(mouseX, mouseY);
    socket.emit('addClick', { user: user, pixel: { x: mouseX, y: mouseY, dragging: false }, meetingId: meetingId, code: myCode.current });
  }

  const handleMouseMove = e => { //Change to useCallback??
    if (paint) {
      let mouseX = e.pageX - drawCanvasRef.current.offsetLeft;
      let mouseY = e.pageY - drawCanvasRef.current.offsetTop
      addClick(mouseX, mouseY, true);
      socket.emit('addClick', { user: user, pixel: { x: mouseX, y: mouseY, dragging: true }, meetingId: meetingId, code: myCode.current });
    }
  }

  return (
    <div id='canvas-container'>

      <canvas
        id='image'
        ref={imageCanvasRef}
      >
      </canvas>
      <canvas
        id='drawCanvas'
        ref={drawCanvasRef}
        onMouseDown={e => handleMouseDown(e.nativeEvent)}
        onMouseMove={e => handleMouseMove(e.nativeEvent)}
        onMouseUp={e => setPaint(false)}
        onMouseLeave={e => setPaint(false)}
        onTouchStart={e => handleMouseDown(e.nativeEvent.touches[0])}
        onTouchMove={e => handleMouseMove(e.nativeEvent.touches[0])}
        onTouchEnd={e => setPaint(false)}
      >
      </canvas>
    </div>
  );
}
