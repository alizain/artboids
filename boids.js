const Benchmark = require('benchmark')
const { Record } = require('immutable')
const kdbush = require('kdbush')
const Vector = require('./vector')


function genRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min)) + min; // inclusive min, exclusive max
}

const GlobalConf = Record({
  maxX: 800,
  maxY: 800,
  maxRadius: 200,
  // scaleFactor: [
  //   e^(-x*1.5),
  //   (1/5)^x
  // ]
  cohesionFactor: 0.01,
  separationFactor: 0.01,
  velocityFactor: 0.01
})

const GlobalState = Record({
  boids: []
})

const TickState = Record({
  index: undefined
})

function genGlobalConf() {
  return new GlobalConf()
}

function genGlobalState(gConf) {
  return new GlobalState()
}

function genTickState(gConf, gState) {
  return new TickState({
    index: genKDTree(gState.boids)
  })
}

function genKDTree(boids) {
  return kdbush(boids, b => b.position.x, b => b.position.y, 32)
}

function populateBoids(gConf, count) {
  const boids = []
  for (let i = 0; i < count; i++) {
    const b = genBoidObject(
      genRandomNumber(0, gConf.maxX),
      genRandomNumber(0, gConf.maxY)
    )
    boids.push(b)
  }
  return boids
}

function genBoidObject(posX, posY) {
  return {
    position: new Vector(posX, posY),
    speed: new Vector(0, 0)
  }
}

function tick(gConf, gState) {
  const tState = genTickState(gConf, gState)
  // const tDeltas = new Map()
  gState.boids.map(boid => {
    return calcBoidDelta(gConf, gState, tState, boid)
  })
}

function calcBoidDelta(gConf, gState, tState, boid) {
  const neighborWeightMap = calcNeighborWeightMap(gConf.maxRadius, gState.boids, tState.index, boid)

  let positionSum = new Vector(0, 0)
  let separationSum = new Vector(0, 0)
  let speedSum = new Vector(0, 0)

  for (let i = 0; i < neighborWeightMap.pairs.length; i++) {
    const currNeighbor = neighborWeightMap.pairs[i]
    // cohesion
    const currWeightedPosition = currNeighbor.b.position.mulScalar(currNeighbor.w)
    positionSum = positionSum.add(currWeightedPosition)
    // separation
    separationSum = separationSum.add(
      currNeighbor.b.position.sub(boid.position)
    )
    // velocity
    const currWeightedSpeed = currNeighbor.b.speed.mulScalar(currNeighbor.w)
    speedSum = speedSum.add(currWeightedSpeed)
  }

  const cohesionVector = positionSum.divScalar(neighborWeightMap.weightSum)
  const velocityVector = speedSum.divScalar(neighborWeightMap.weightSum)
}

function calcNeighborWeightMap(maxRadius, boids, index, boid) {
  const found = index.within(boid.position.x, boid.position.y, maxRadius)
  let weightSum = 0
  let pairs = []
  for (let i = 0; i < found.length; i++) {
    const b = boids[i]
    if (b !== boid) {
      weightSum += 1
      pairs.push({ b, w: 1 })
    }
  }
  return { weightSum, pairs }
}

const suite = new Benchmark.Suite()

function run() {
  const gConf = genGlobalConf()
  const gState = genGlobalState()
  Array.prototype.push.apply(gState.boids, populateBoids(gConf, 1000))
  suite.add(() => {
    tick(gConf, gState)
  }).run()
  console.log(suite)
}

run()
