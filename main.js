var el = document.getElementById.bind(document)

var el_canvas = el('canvas')
var ctx = el_canvas.getContext('2d')

var G = {V: [], E: []}

function add_node(node) {
  G.V.push(node)
}

function add_edge(edge) {
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

function nearest(nodes, addr) {
  var closest, min = Infinity

  for(var i = 0; i < nodes.length; i++) {
    var node = nodes[0]
    var d = distance(node.addr, addr)
    if(d >= min) continue
    min = d
    closest = node
  }

  return closest
}






// RENDER PIPELINE

document.addEventListener('keypress', function(ev) {
  var key = ev.keyCode || ev.which
  var n = 110
  var p = 112
  var a = 97
  var s = 115

  if(key === n) {
    build_pipeline()
    pipeline(G)
  }

  if(key === p) {
    build_pipeline()
    pipeline(G)
  }

  if(key === a) {
    pipeline(G)
  }

  if(key === s) {
    pipeline(G)
  }
})

var wrapper = {data: [], params: {}, shapes: []}
var pipeline = noop
build_pipeline()

function build_pipeline() {
  pipeline = pipe( wrap(wrapper, 'data')
                 , add_area_rects, add_nodes, add_edges
                 , draw_it )
}


function wrap(env, prop) {
  return function(data) {
    var foo = clone(env)
    foo[prop] = data
    return foo
  }
}

function add_area_rects(env) {
  for(var x = 0; x < 256; x++) {
    for(var y = 0; y < 256; y++) {
      var node = nearest(env.data.V, coords_to_addr(x, y))
      var color = addr_to_color(node.addr)
      var shape = {shape: 'rect', x:x, y:y, w:1, h:1, color: color}
      env.shapes.push(shape)
    }
  }
  return env
}

function add_nodes(env) {

  return env
}

function add_edges(env) {

  return env
}



function draw_it(env) {
  env.shapes.forEach(function(node) {
    draw_shape(ctx, node)
  })
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
