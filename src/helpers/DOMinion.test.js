const assert = require('assert'),
  xmldom = require('xmldom'),
  DOM = require('../../dist/groundup.js').DOMinion,
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
  });
});
