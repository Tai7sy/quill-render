const escapeHtml = require('escape-html');

exports = module.exports = function (ops) {
  return convert(ops).innerHTML;
};

exports.asDOM = convert;

const format = exports.format = {

  block: {
    image: function (src) {
      const img = document.createElement('img');
      img.src = src;
      this.appendChild(img);
    }
  },

  inline: {
    italic: function () {
      return document.createElement('i');
    },
    bold: function () {
      return document.createElement('b');
    },
    link: function (href) {
      const a = document.createElement('a');
      a.href = href;
      return a;
    }
  },

  lineify: {
    h1: function () {
      const newElm = document.createElement('h1');
      newElm.innerHTML = this.innerHTML;
      this.parentNode.replaceChild(newElm, this);
    },
    h2: function () {
      const newElm = document.createElement('h2');
      newElm.innerHTML = this.innerHTML;
      this.parentNode.replaceChild(newElm, this);
    },
    h3: function () {
      const newElm = document.createElement('h3');
      newElm.innerHTML = this.innerHTML;
      this.parentNode.replaceChild(newElm, this);
    },
    bullet: {
      group: function () {
        return document.createElement('ul');
      },
      line: function () {
        const newElm = document.createElement('li');
        newElm.innerHTML = this.innerHTML;
        this.parentNode.replaceChild(newElm, this);
      }
    },
    list: {
      group: function () {
        return document.createElement('ol');
      },
      line: function () {
        const newElm = document.createElement('li');
        newElm.innerHTML = this.innerHTML;
        this.parentNode.replaceChild(newElm, this);
      }
    }
  }

};

function convert (ops) {
  const root = document.createElement('div');
  let group, line, el, activeInline, beginningOfLine;

  function newLine () {
    el = line = document.createElement('p');
    root.appendChild(line);
    activeInline = {};
  }

  newLine();

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.insert === 1) {
      for (let k in op.attributes) {
        if (format.block[k]) {
          newLine();
          applyStyles(op.attributes);
          format.block[k].call(el, op.attributes[k]);
          newLine();
        }
      }
    } else {
      const lines = escapeHtml(op.insert).split('\n');

      if (isLinifyable(op.attributes)) {
        // Some line-level styling (ie headings) is applied by inserting a \n
        // with the style; the style applies back to the previous \n.
        // There *should* only be one style in an insert operation.

        for (let j = 1; j < lines.length; j++) {
          for (let k in op.attributes) {
            if (format.lineify[k]) {

              let fn = format.lineify[k];
              if (typeof fn == 'object') {
                if (group && group.type !== k) {
                  group = null;
                }
                if (!group && fn.group) {
                  group = {
                    el: fn.group(),
                    type: k,
                    distance: 0
                  };
                  root.appendChild(group.el);
                }

                if (group) {
                  group.el.appendChild(line);
                  group.distance = 0;
                }
                fn = fn.line;
              }

              fn.call(line, op.attributes[k]);
              newLine();
              break;
            }
          }
        }
        beginningOfLine = true;

      } else {
        for (let j = 0; j < lines.length; j++) {
          if ((j > 0 || beginningOfLine) && group && ++group.distance >= 2) {
            group = null;
          }
          applyStyles(op.attributes, ops[i + 1] && ops[i + 1].attributes);
          el.innerHTML += lines[j];

          if (j < lines.length - 1) {
            newLine();
          }
        }
        beginningOfLine = false;

      }
    }
  }

  return root;


  function applyStyles (attrs, next) {

    const first = [], then = [];
    attrs = attrs || {};

    let tag = el, seen = {};
    while (tag._format) {
      seen[tag._format] = true;
      if (!attrs[tag._format]) {
        for (const k in seen) {
          delete activeInline[k];
        }
        el = tag.parentNode;
      }

      tag = tag.parentNode;
    }

    for (const k in attrs) {
      if (format.inline[k]) {

        if (activeInline[k]) {
          if (activeInline[k] !== attrs[k]) {
            // ie when two links abut

          } else {
            continue; // do nothing -- we should already be inside this style's tag
          }
        }

        if (next && attrs[k] === next[k]) {
          first.push(k); // if the next operation has the same style, this should be the outermost tag
        } else {
          then.push(k);
        }
        activeInline[k] = attrs[k];

      }
    }

    first.forEach(apply);
    then.forEach(apply);

    function apply (fmt) {
      const newEl = format.inline[fmt].call(null, attrs[fmt]);
      newEl._format = fmt;
      el.appendChild(newEl);
      el = newEl;
    }


  }
}

function isLinifyable (attrs) {
  for (const k in attrs) {
    if (format.lineify[k]) {
      return true;
    }
  }
  return false;
}




