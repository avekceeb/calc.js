


function dbg() {
    console.log(Array.prototype.slice.call(arguments).join(' | '));
}



function Svg(id, w, h) {

    var that = this,
        width,
        height,
        xInverted = false,
        yInverted = false;

    function G(id) {
        SvgElement.call(this, 'g', id);
    }

    function Line(x0, y0, x1, y1, id) {
        SvgElement.call(this, 'path', id);
        if (typeof x0 === 'undefined')
            return;
        this.set('d', `M ${x0},${y0} l ${x1},${y1}`);
    }

    function Path(xs, ys, id) {
        SvgElement.call(this, 'path', id);
        if (!xs)
            return;
        let points = [];
        for (let i in xs) {
            points.push(`${xs[i]},${ys[i]}`);
        }
        this.set('d', 'M ' + points.join(' L'));
    }

    function Circle(x, y, r, id) {
        SvgElement.call(this, 'circle', id);
        this.set('cx', x);
        this.set('cy', y);
        this.set('r', r);
    }

    function Rectangle(x, y, w, h, id) {
        SvgElement.call(this, 'rect', id);
        this.set('x', x);
        this.set('y', y);
        this.set('width', w);
        this.set('height', h);
    }

    function Text(x, y, value, id) {
        SvgElement.call(this, 'text', id);
        this.set('x', x);
        this.set('y', y);
        this.e.innerHTML = value;
    }

    function SvgElement(tag, id, find) {
        // TODO: set / dont set props/meth depending on tag
        //this.tag = tag;
        this.e = null;
        this.p = null;
        if (id) {
            this.e = document.getElementById(id);
        }
        if ((!this.e) && (!find)) {
            this.e = document.createElementNS("http://www.w3.org/2000/svg", tag);
            if (id)
                this.e.setAttribute('id', id);
        }

        this.transform = function(tx, ty, sx, sy) {
            if (typeof sx === 'undefined') {
                sx = 1;
                sy = 1;
            }
            this.e.setAttribute('transform',
                `translate(${tx},${ty}) scale(${sx},${sy})`);
            return this;
        }

        this.set = function(k, v) {
            if (typeof k === 'object') {
                for (let i in k) {
                    this.e.setAttribute(i, k[i]);
                }
            } else {
                this.e.setAttribute(k, v);
            }
            return this;
        }

        // this.find = function(id) {
        //     return new SvgElement(null, id, true);
        // }

        this.child = function(parent) {
            if (typeof parent === 'string') {
                this.p = new SvgElement(null, parent);
                this.p.e.appendChild(this.e);
            } else if (!(parent instanceof Element)) {
                this.p = parent;
                this.p.e.appendChild(this.e);
            } else {
                parent.appendChild(this.e);
            }
            // TODO: else
            return this;
        }

        this.parent = function() {
            return this.p;
        }

        this.clear = function() {
            while (this.e.firstChild) {
                this.e.removeChild(this.e.lastChild);
            }
            return this;
        }

        this.color = function(color) {
            if (this instanceof Line || this instanceof Path) {
                this.e.setAttribute('stroke', color);
            }
            if (this instanceof Circle || this instanceof Rectangle) {
                this.e.setAttribute('fill', color);
            }
            return this;
        }

        this.g = function(id) {
            // Should these methods
            // return new objects???
            return (new G(id)).child(this);
            // return this;
        }

        this.line = function(x0, y0, x1, y1, id) {
            return (new Line(x0, y0, x1, y1, id)).child(this);
        }

        this.vline = function(x0, y0, l, id) {
            return (new Line(x0, y0, 0, l, id)).child(this);
        }

        this.hline = function(x0, y0, l, id) {
            return (new Line(x0, y0, l, 0, id)).child(this);
        }

        this.path = function(xs, ys, id) {
            return (new Path(xs, ys, id)).child(this);
        }

        this.circle = function(x, y, r, id) {
            return (new Circle(x, y, r, id)).child(this);
        }

        this.rectangle = function(x, y, w, h, id) {
            return (new Rectangle(x, y, w, h, id)).child(this);
        }

        this.text = function(x, y, value, id) {
            return (new Text(x, y, value, id)).child(this);
        }

        this.title = function(value, id) {
            return (new (function(){
                SvgElement.call(this, 'title', id);
                this.e.innerHTML = value;
            })).child(this);
        }
        // this.finish = function() {
        //     delete this.e;
        //     delete this.transform;
        // }
    }


    SvgElement.call(this, 'svg', id);
    width = w ||
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.getElementsByTagName('body')[0].clientWidth;
    height = h ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.getElementsByTagName('body')[0].clientHeight;
    this.set('width', width).set('height', height);
    this.set('viewBox', [0,0,width,height].join(' '));
}


function Chart(id, w, h, type) {

    var Type = 'xy', // xy | polar
        XInverted = false,
        YInverted = true,
        Pad = 30, // px
        Sx = 1,
        Sy = 1,
        Data = [], // array of series [x] [y], [x] [y]...
        // TODO: if w < pad ???
        Root = new Svg(id, w, h),
        Width = w - Math.floor(Pad*1.3),
        Height = h - Math.floor(Pad*1.3),
        Grid = null,
        Chart = null,
        Legend = null;

    var Colors = (function*() {
        var c = ['#FF69B4', '#6B8E23', '#F08080', '#2E8B57', '#FFA500',
            '#20B2AA', '#A52A2A', '#1E90FF', '#8B008B'];
        var i = Math.floor(Math.random()*c.length);
        while (true) {
            yield c[(i++) % c.length];
        }
    })();


    function Series(xs, ys, attrs) {
        if (xs instanceof Array) {
            // Array
            this.xs = xs;
        } else if (typeof xs === 'object' && typeof xs.next === 'function') {
            // Generator
            this.xs = [];
            for (let i of xs) {
                this.xs.push(i);
            }
        } else {
            throw 'Bad X series!'
        }
        if (ys instanceof Array) {
            this.ys = ys;
        } else if (typeof ys === 'object' && typeof ys.next === 'function') {
            this.ys = [];
            for (let i of ys) {
                this.ys.push(i);
            }
        } else if (typeof ys === 'function') {
            this.ys = [];
            for (let i of xs) {
                this.ys.push(ys(i));
            }
        } else {
            throw 'Bad Y series!'
        }
        // TODO: if xs.length > ys.length
        this.x0 = Math.min.apply(null, this.xs);
        this.x1 = Math.max.apply(null, this.xs);
        this.y0 = Math.min.apply(null, this.ys);
        this.y1 = Math.max.apply(null, this.ys);
        // TODO
        if (typeof attrs === 'object') {
            Object.assign(this, attrs);
        }
    }

    function rescale() {
        if (Data.length == 0)
            return;
        // TODO: polar ???
        // find ranges for X and Y
        let x0 = Data[0].x0,
            x1 = Data[0].x1,
            y0 = Data[0].y0,
            y1 = Data[0].y1;
        for (let i=1; i<Data.length; i++) {
            x0 = Math.min(x0, Data[i].x0);
            x1 = Math.max(x1, Data[i].x1);
            y0 = Math.min(y0, Data[i].y0);
            y1 = Math.max(y1, Data[i].y1);
        }
        Sx = Width / (x1 - x0);
        Sy = Height / (y1 - y0);
        // TODO: Tx Ty depends on X Y Inverted
        Chart.transform(-x0*Sx, Height+y0*Sy, -1*XInverted+(!XInverted), -1*YInverted+(!YInverted));
    }

    this.data = function(xs, ys, name, attrs) {
        Data.push(new Series(xs, ys, name, attrs));
        return this;
    }

    this.nodata = function() {
        Data.splice(0, Data.length);
    }

    this.show = function() {
        Chart.clear();
        rescale();
        for (let series of Data) {
            let type = series.type || 'line-dot-tip';
            let color = series.color ? series.color : Colors.next().value;
            let xs = series.xs.map(x => x*Sx);
            let ys = series.ys.map(x => x*Sy);
            if (type.indexOf('line') !== -1) {
                Chart.path(xs, ys).color(color);
            }
            if (type.indexOf('dot') !== -1) {
                for (let i in xs) {
                    let d = Chart.circle(xs[i], ys[i], 2).color(color);
                    if (type.indexOf('tip') !== -1) {
                        // value in real scale
                        d.title(`${series.xs[i]} , ${series.ys[i]}`);
                    }
                }
            }
        }
    }

    this.child = function(parent) {
        Root.child(parent);
        return this;
    }

    Chart = Root.g().transform(Pad, Pad)
        .rectangle(0, 0, Width, Height).set({fill: 'none', stroke: '#d0d0d0'})
        .parent()
        // initially: x - not inverted ; y - inverted
        .g('chart').transform(0, Height, 1, -1);
}


function getEquidistant(x0, x1, n) {
    // returns array of n+1 numbers between x0..x1
    var a = [];
    if (n <= 0) {
        return a;
    }
    a.push(x0);
    if (n == 1) {
        return a;
    }
    var dx = (x1 - x0)/n;
    for (var i=1; i<n; i++) {
        x0 += dx;
        a.push(x0);
    }
    a.push(x1);
    return(a);
}





var B = document.querySelector('body');
B.onload = function() {
    let xs = getEquidistant(-100, 200, 20);
    let ys = xs.map(x => x*x/(30));
    (new Chart('chart', 800, 600))
        .child(B)
        .data(xs.map(x => x/10), ys)
        .data(xs, x => x*2, {type: 'dot'})
        .show();
};
