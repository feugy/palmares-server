module.exports = (state, emitter) => {
  state.totalClicks = 0

  emitter.on('DOMContentLoaded', () =>
    emitter.on('clicks:add', count => {
      state.totalClicks += count
      emitter.emit(state.events.RENDER)
    })
  )
}
