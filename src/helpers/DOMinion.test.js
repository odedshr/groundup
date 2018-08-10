const assert = require('assert'),
  xmldom = require('xmldom'),
  DOM = require('../../.bin/groundup.js').DOMinion,
  parser = new xmldom.DOMParser(),
  serializer = new xmldom.XMLSerializer();

describe('DOMinion', () => {
  describe('DOMinion.map', () => {
    const map = tree => Array.from(DOM.map(tree).keys()).join();
    it('should map by text content', () => {
      let tree1 = parser.parseFromString('<div>Foo</div>');

      assert.equal(map(tree1), 'root,div=Foo,div=Foo>Text[0]');
    });

    it('should map by id', () => {
      let tree1 = parser.parseFromString('<div id="Bar">Foo</div>');

      assert.equal(map(tree1), 'root,div#Bar,div#Bar>Text[0]');
    });

    it('should map by name', () => {
      let tree1 = parser.parseFromString('<div name="Bar">Foo</div>');

      assert.equal(map(tree1), 'root,div|name:Bar,div|name:Bar>Text[0]');
    });

    it('should map by href', () => {
      let tree1 = parser.parseFromString('<a href="Bar">Foo</a>');

      assert.equal(map(tree1), 'root,a|href:Bar,a|href:Bar>Text[0]');
    });

    it('should map by src', () => {
      let tree1 = parser.parseFromString('<img src="Bar" />');

      assert.equal(map(tree1), 'root,img|src:Bar');
    });

    it('should map a complicated tree', () => {
      let tree1 = parser.parseFromString(
        '<ul><li><div>foo</div></li><li><div>bar</div></li></ul>'
      );

      assert.equal(
        map(tree1),
        'root,root>ul[0],root>ul[0]>li[1],div=bar,div=bar>Text[0],root>ul[0]>li[0],div=foo,div=foo>Text[0]'
      );
    });

    it('should map an complicated tree', () => {
      let tree1 = parser.parseFromString(
        '<ul id="list"><li name="item"><a href="yy"><img src="xx" /></a></li><li><div>item 2</div></li></ul>'
      );
      assert.equal(
        map(tree1),
        'root,ul#list,ul#list>li[1],div=item2,div=item2>Text[0],li|name:item,a|href:yy,img|src:xx'
      );
    });
  });

  describe('DOMinion.update', () => {
    it('should replace a tree entirely', () => {
      let tree1 = parser.parseFromString(
          '<ul><li>item 1</li><li>item 2</li></ul>'
        ),
        tree2 = parser.parseFromString(
          '<ul><li>item 3</li><li>item 4</li></ul>'
        );

      DOM.update(tree1, tree2);

      assert.equal(
        serializer.serializeToString(tree1),
        '<ul><li>item 3</li><li>item 4</li></ul>'
      );
    });

    it('should append a tree', () => {
      try {
        let tree1 = parser.parseFromString('<ul><li>item 1</li></ul>'),
          tree2 = parser.parseFromString(
            '<ul><li>item 1</li><li>item 2</li></ul>'
          ),
          node = tree1.childNodes[0].childNodes[0];

        DOM.update(tree1, tree2);

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>item 1</li><li>item 2</li></ul>'
        );
        assert.equal(node, tree1.childNodes[0].childNodes[0]);
      } catch (err) {
        console.log(err);
      }
    });

    it('should add in the middle', () => {
      try {
        let tree1 = parser.parseFromString(
            '<ul><li>item 1</li><li>item 3</li></ul>'
          ),
          tree2 = parser.parseFromString(
            '<ul><li>item 1</li><li>item 2</li><li>item 3</li></ul>'
          ),
          node = tree1.firstChild.lastChild;

        DOM.update(tree1, tree2);

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>item 1</li><li>item 2</li><li>item 3</li></ul>'
        );
        assert.equal(node, tree1.firstChild.lastChild);
      } catch (err) {
        console.log(err);
      }
    });

    it('should prepend a tree', () => {
      try {
        let tree1 = parser.parseFromString('<ul><li>item 2</li></ul>'),
          tree2 = parser.parseFromString(
            '<ul><li>item 1</li><li>item 2</li></ul>'
          ),
          node = tree1.childNodes[0].childNodes[0];

        DOM.update(tree1, tree2);

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>item 1</li><li>item 2</li></ul>'
        );
        assert.equal(node, tree1.childNodes[0].childNodes[1]);
      } catch (err) {
        console.log(err);
      }
    });

    it('should update node that came from new tree', () => {
      try {
        let tree1 = parser.parseFromString('<ul><li>item 2</li></ul>'),
          tree2 = parser.parseFromString(
            '<ul><li>foo</li><li>item 2</li></ul>'
          ),
          node = tree2.childNodes[0].childNodes[0];

        DOM.update(tree1, tree2);

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>foo</li><li>item 2</li></ul>'
        );

        node.childNodes[0].data = 'bar';

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>bar</li><li>item 2</li></ul>'
        );
      } catch (err) {
        console.log(err);
      }
    });
  });

  describe('DOMinion.bind', () => {
    it('should bind a controller to a node', () => {
      let tree1 = parser.parseFromString('<div data-js="controller">Foo</div>'),
        isBinded = false,
        errors = DOM.bind(tree1, { controller() { isBinded = true; } });

      assert.equal(isBinded, true);
      assert.equal(errors.length, 0);
    });

    it('should report missing controllers', () => {
      let tree1 = parser.parseFromString('<div data-js="controller">Foo</div>'),
        errors = DOM.bind(tree1, {});
      
      assert.equal(errors.length, 1);
      assert.equal(errors[0].message, 'not-found');
      assert.equal(errors[0].details.key, 'controller not found');
      assert.equal(errors[0].details.value, 'controller');
    });

    it('shouldn\'t bind twice', () => {
      let tree1 = parser.parseFromString('<div data-js="controller">Foo</div>'),
        bindCount = 0,
        controllers = { controller() { bindCount++; } };
      
      DOM.bind(tree1, controllers);
      DOM.bind(tree1, controllers);

      assert.equal(bindCount, 1);
    });

    it('should be forced to bind twice', () => {
      let tree1 = parser.parseFromString('<div data-js="controller">Foo</div>'),
        bindCount = 0,
        controllers = { controller() { bindCount++; } };
      
      DOM.bind(tree1, controllers);
      DOM.bind(tree1, controllers, true);

      assert.equal(bindCount, 2);
    });

    it('should append a tree while keep the controller intact', () => {
      try {
        let tree1 = parser.parseFromString(
            '<ul><li data-js="controller">item 1</li></ul>'
          ),
          tree2 = parser.parseFromString(
            '<ul><li data-js="controller">item 1</li><li data-js="controller">item 2</li></ul>'
          );

        DOM.bind(tree1, {
          controller(node) {
            node.childNodes[0].data = 'item 1.1';
          }
        });
        DOM.bind(tree2, {
          controller(node) {
            node.childNodes[0].data = 'item 2.1';
          }
        });
        DOM.update(tree1, tree2);

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li data-js="controller" data-js-binded="true">item 1.1</li><li data-js="controller" data-js-binded="true">item 2.1</li></ul>'
        );
      } catch (err) {
        console.log(err);
      }
    });

    it('should retain controller connection after update', () => {
      try {
        const nodes = [],
          controller = node => nodes.push(node);

        let tree1 = parser.parseFromString(
            '<ul><li data-js="controller">item 2</li></ul>'
          ),
          tree2 = parser.parseFromString(
            '<ul><li data-js="controller">item 1</li><li data-js="controller">item 2</li></ul>'
          );

        DOM.bind(tree1, { controller });
        DOM.update(tree1, tree2);

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li data-js="controller">item 1</li><li data-js="controller" data-js-binded="true">item 2</li></ul>'
        );

        nodes[0].childNodes[0].data = 'item 2.1';

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li data-js="controller">item 1</li><li data-js="controller" data-js-binded="true">item 2.1</li></ul>'
        );
      } catch (err) {
        console.log(err);
      }
    });

    it('should update controller', () => {
      try {
        const controller = newNode => { node = newNode};

        let tree1 = parser.parseFromString(
            '<ul><li data-js="controller">item 2</li></ul>'
          ),
          tree2 = parser.parseFromString(
            '<ul><li>item 1</li><li data-js="controller">item 2</li></ul>'
          ),
          node;

        DOM.update(tree1, tree2, { controller });

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>item 1</li><li data-js="controller" data-js-binded="true">item 2</li></ul>'
        );

        node.childNodes[0].data = 'item 2.1';

        assert.equal(
          serializer.serializeToString(tree1),
          '<ul><li>item 1</li><li data-js="controller" data-js-binded="true">item 2.1</li></ul>'
        );
      } catch (err) {
        console.log(err);
      }
    });

    it('should force update controller', () => {
      try {
        const controller = () => { count++ };

        let tree1 = parser.parseFromString(
            '<ul><li data-js="controller">item 2</li></ul>'
          ),
          tree2 = parser.parseFromString(
            '<ul><li>item 1</li><li data-js="controller">item 2</li></ul>'
          ),
          count = 0;

        DOM.bind(tree1, { controller });
        
        assert.equal(count, 1);
        
        DOM.update(tree1, tree2, { controller }, true);

        assert.equal(count, 2);
      } catch (err) {
        console.log(err);
      }
    });
  });
});
