// One manyringed network to bind them all together

var el = document.getElementById.bind(document)

var el_canvas = el('canvas')
var ctx = el_canvas.getContext('2d')

var G = {V: [], E: []}
var nets = {}

// NETWORK STUFF

function add_network(net) {
  // TODO: check for net.name
  // TODO: check for net.send(msg, nabe)
  // TODO: check for net.receive(cb(msg, nabe))
  // TODO: check for net.connect(???)
  // TODO: check for net.disconnect(nabe)
  // TODO: a nabe has an id, but otherwise could be anything
  nets[net.name] = net
}

var webrtc = { name: webrtc
             , nabes: []
             , send: function(id, msg) {}
             , receive: function(cb) {}
             , connect: function(id) {}
             , disconnect: function(id) {}
             }

add_network(webrtc)


// NODE STUFF

function make_node(id, props) {
  // inside here, we're a single node.

  // start routing stuff
  // there's a routing table between the low-level network interfaces and the network modules, so neither side has to think about which node lives on which physical network.
  var routing = {}

  routing.table = {} // id -> network
  routing.send = function(id, msg) { nets[routing.table[id]].send(id, msg) }
  routing.shake = function(id, msg) { if(shake(msg)) routing.table[id] = 'webrtc' /*hack*/ }
  routing.connect = function(id) {} // THINK: how do we fill out the routing table??
  // end routing stuff

  var addr = id_to_addr(id)
  var nabes = [addr]
  var data = {}

  function id_to_addr(id) {
    // FIXME: temporary
    return id
  }

  function receive(msg) {
    var next = passthru(msg)
    if(next) return false

    if(msg.type === 'shake') return routing.shake(msg.node, msg) // hack hack hack
    if(msg.type === 'query') return query(msg)
    if(msg.type === 'store') return store(msg)
    return trash(msg)
  }

  function passthru(msg) {
    if(!msg.addr) return true // this is weird
    var nabe = nearest(nabes, msg.addr)
    if(nabe === id) return false
    send(nabe, msg)
    return nabe
  }

  function shake(msg) {
    // TODO: is msg.node really something we should be connected to?
    // TODO: should we cancel an existing connection?

    // THINK: msg.node is the network layer's "self" version, which must contain a unique id field
    // THINK: maybe only expose the first ~6 digits of addr, until a collision forces more. then take turns sharing a digit, until the collision is resolved...

    nabes.push(msg.node)
    return true
  }

  function query(msg) {
    // return some piece of information or something (?)
    var val = data[msg.key]
    // TODO: fix id/addr conflation
    send(msg.from, {addr: msg.from, type: 'result', val: val, from: id})
  }

  function store(msg) {
    // store some piece of information
    data[msg.key] = msg.val
    // TODO: send back a receipt?
  }

  function trash(msg) {
    // do nothing
  }

  function send(addr, msg) {
    // pass msg to a neighbor closer to addr
    var nabe = nearest(nabes, addr)
    routing.send(nabe, msg)
  }




  return { id: id
         , addr: addr
         , nabes: nabes
         , props: props
         , receive: receive
         }
}





// SIMULATOR STUFF

function add_node(node) {
  // add a node to the simulator
  G.V.push(node)
}

function add_edge(edge) {
  // add an edge to the simulator
  G.E.push(edge)
}

function show_graph() {
  pipeline(G)
}

function rand(n) {
  return Math.floor(Math.random()*n)
}

function randnode() {
  var addr = [rand(16), rand(16), rand(16), rand(16)]
  var node = {addr: addr}
  add_node(node)
  return node
}

function rns(n) {
  for(var i = 0; i < n; i++) {
    randnode()
  }
}


function distance(a1, a2) {
  return dist16(a1[0], a2[0])
       + dist16(a1[1], a2[1])
       + dist16(a1[2], a2[2])
       + dist16(a1[3], a2[3])
}

function dist16(h1, h2) {
  var d = Math.abs(h1-h2)
  return d < 8 ? d : 16-d
}

function nearest(nabes, addr) {
  var closest, min = Infinity

  for(var i = 0; i < nabes.length; i++) {
    var d = distance(nabes[i], addr)
    if(d >= min) continue
    min = d
    closest = nabes[i]
  }

  return closest
}

function coords_to_addr(x, y) {
  return [Math.floor(x/16), x%16, Math.floor(y/16), y%16]
}

function addr_to_coords(addr) {
  return {x: addr[0]*16 + addr[1], y: addr[2]*16 + addr[3]}
}

function addr_to_color(addr) {
  var n = (addr[0] + addr[1] + addr[2] + addr[3]) + (addr[0] * addr[1] * addr[2] * addr[3])
  var color = 'hsla(' + n%360 + ', 100%, 70%, 1)'
  return color
}






// RENDER PIPELINE

document.addEventListener('keypress', function(ev) {
  var key = ev.keyCode || ev.which
  var n = 110
  var p = 112
  var a = 97
  var s = 115

  if(key === n) {
    randnode()
    pipeline(G)
  }

  if(key === p) {
    G.V.pop()
    pipeline(G)
  }

})

var wrapper = {data: [], params: {}, shapes: []}
var pipeline = noop
build_pipeline()

function build_pipeline() {
  pipeline = pipe( wrap(wrapper, 'data')
                 , add_area_rects, add_nodes, add_edges
                 , magnify(3), draw_it )
}


function wrap(env, prop) {
  return function(data) {
    var foo = clone(env)
    foo[prop] = data
    return foo
  }
}

function add_area_rects(env) {
  var addrs = env.data.V.map(prop('addr'))
  for(var x = 0; x < 256; x++) {
    for(var y = 0; y < 256; y++) {
      var nabe = nearest(addrs, coords_to_addr(x, y))
      var color = addr_to_color(nabe)
      var shape = {shape: 'rect', x:x, y:y, w:1, h:1, fill: color}
      env.shapes.push(shape)
    }
  }
  return env
}

function add_nodes(env) {
  env.data.V.forEach(function(node) {
    var pair = addr_to_coords(node.addr)
    var color = 'black'
    var shape = {shape: 'rect', x: pair.x, y: pair.y, w: 1, h: 1, fill: color}
    env.shapes.push(shape)
  }
)
  return env
}

function add_edges(env) {

  return env
}


function magnify(n) {
  return function(env) {
    env.shapes.map(function(shape) {
      shape.x *= n
      shape.y *= n
      shape.w *= n
      shape.h *= n
      shape.r *= n
      return shape
    })
    return env
  }
}


function draw_it(env) {
  // env.shapes.forEach(function(node) {
  //   draw_shape(ctx, node)
  // })
  var shapes = env.shapes
  for(var i = 0, len = shapes.length; i < len; i++) {
    draw_shape(ctx, shapes[i])
  }
}

function draw_shape(ctx, node) {
  if(node.shape === 'rect')
    draw_rect(ctx, node.x, node.y, node.w, node.h, node.stroke, node.fill, node.line)

  if(node.shape === 'circle')
    draw_circle(ctx, node.x, node.y, node.r, node.stroke, node.fill, node.line)

  if(node.shape === 'line')
    draw_line(ctx, node.x1, node.y1, node.x2, node.y2, node.stroke, node.line)

  if(node.shape === 'text')
    draw_text(ctx, node.x, node.y, node.str, node.font)
}


function draw_text(ctx, x, y, str, font) {
  font = font || "12p sans-serif"
  x = x || 0
  y = y || 0
  ctx.fillText(str, x, y)
}


function draw_line(ctx, fromx, fromy, tox, toy, stroke_color, line_width) {
  var path=new Path2D()
  path.moveTo(fromx, fromy)
  path.lineTo(tox, toy)
  ctx.strokeStyle = stroke_color || '#eef'
  ctx.lineWidth = line_width || 0.5
  ctx.stroke(path)
}

function draw_circle(ctx, x, y, radius, stroke_color, fill_color, line_width) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2*Math.PI, false)
  ctx.fillStyle = fill_color || '#444444'
  ctx.fill()
  ctx.lineWidth = line_width || 2
  ctx.strokeStyle = stroke_color || '#eef'
  ctx.stroke()
}

function draw_rect(ctx, x, y, w, h, stroke_color, fill_color, line_width) {
  ctx.fillStyle = fill_color || '#444444'
  ctx.lineWidth = line_width || 2
  ctx.strokeStyle = stroke_color || '#eef'
  ctx.fillRect(x, y, w, h)
}



// INIT

function init() {
  rns(10)
  show_graph()
}


init()


// HELPERS

function noop() {}

function eq(attr, val) {return function(obj) {return obj[attr] === val}}

function unique(v, k, list) {return list.indexOf(v) === k}

function strip(attr) {return function(obj) { delete obj[attr]; return obj }}

function comp(f, g) {return function() { var args = [].slice.call(arguments); return f(g.apply(null, args)) }}

function prop (attr) {return function(obj) {return obj[attr]}}

function cp_prop(from_attr, to_attr) {return function(obj) {obj[to_attr] = obj[from_attr]; return obj}}

function clone(obj) {return JSON.parse(JSON.stringify(obj))}

function pipe() {
  var all_funs = [].slice.call(arguments)

  function magic_pipe(data) {
    var funs = all_funs.slice()
    var fun

    function inner() {
      while(fun = funs.shift()) {
        if(fun.async) {              // fun is async
          return fun.async(data, cb)
        } else {                     // fun is a function
          data = fun(data)
        }
      }
    }

    function cb(new_data) {
      data = new_data
      inner()
    }

    // TODO: this should return a promise for data
    inner()
    return true
  }

  return magic_pipe
}

function err(mess) {
  console.log(arguments, mess)
}
