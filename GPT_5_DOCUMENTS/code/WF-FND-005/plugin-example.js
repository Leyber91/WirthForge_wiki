module.exports = function init(runtime) {
  return {
    onFrame(frame) {
      // respond within the frame budget
      runtime.emit({ channel: 'plugin', frame, payload: { ping: 'pong' } });
    }
  };
};
