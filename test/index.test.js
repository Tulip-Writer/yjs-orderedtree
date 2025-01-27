import * as Y from "yjs";
import { checkForYTree, YTree } from "../src/index";
import { jest } from '@jest/globals';
import { edgeWithLargestCounter } from "../src/util";

/* 
* @param {Map} computedMap 
* @param {Map} map 
*/
const checkComputedMap = (computedMap, map) => {
  for (const [child, parent] of map.entries()) {
    if (child === "root") {
      if (computedMap.get(child).parent !== null) {
        return false;
      }

      continue;
    }

    if (computedMap.get(child).parent.id !== parent) {
      return false;
    }
  }

  return true;
}

/**
 * 
 * @param {Y.Doc} ydoc1 
 * @param {Y.Doc} ydoc2 
 */
const syncTwoYDocs = (ydoc1, ydoc2) => {
  const stateVector1 = Y.encodeStateVector(ydoc1)
  const stateVector2 = Y.encodeStateVector(ydoc2)
  const diff1 = Y.encodeStateAsUpdate(ydoc1, stateVector2)
  const diff2 = Y.encodeStateAsUpdate(ydoc2, stateVector1)
  Y.applyUpdate(ydoc1, diff2)
  Y.applyUpdate(ydoc2, diff1)
}


describe('index.js', () => {
  test("ytree throws error when not passed a ymap instance", () => {
    expect(() => {
      const yTree = new YTree();
      yTree.getYMap();
    }).toThrow('[ytree] expected a yMap argument');
  });

  test('ytree throws error when passed ymap not bounded to a y.doc', () => {
    expect(() => {
      const yMap = new Y.Map();
      const yTree = new YTree(yMap);
      yTree.getYMap();
    }).toThrow("[ytree] expected yMap to be bounded to a Y.Doc instance");
  });

  test('ytree throws error when passed invalid ymap', () => {
    expect(() => {
      const yDoc = new Y.Doc();
      const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
      yMap.set("key", "value");
      const yTree = new YTree(yMap);
      yTree.getYMap();
    }).toThrow("[ytree] expected yMap to either be initialized for ytree or empty");
  })

  test('checkIfYMapIsInitializedForYTree returns false for uninitialized ymap', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    yMap.set("key", "value");
    const result = checkForYTree(yMap);
    expect(result).toEqual(false);
  });

  test('checkIfYMapIsInitializedForYTree returns true for initialized ymap', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    const result = checkForYTree(yMap);
    expect(result).toEqual(true);
  });

  test("Ytree.create node throws error when called with non existent parent key", () => {
    expect(() => {
      const yDoc = new Y.Doc();
      const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
      const yTree = new YTree(yMap);
      yTree.createNode("b", "a", "a_value");
    }).toThrow("[ytree] Parent with key: " + "b" + " does not exist");
  })

  test('YTree.createNode adds node when called', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");

    yTree.createNode("a", "c", "c_value");
    yTree.createNode("a", "d", "d_value");

    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");


    expect(checkComputedMap(yTree.computedMap, new Map([["root", null], ["a", "root"], ["b", "root"], ["c", "a"], ["d", "a"], ["e", "b"], ["f", "b"]]))).toEqual(true);
  });

  test("YTree.createNode initializes node with value and _parentHistory", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "a", "a_value");

    const node = yTree.getYMap().get("a");
    expect(node.get("value")).toBe("a_value");
    expect(node.has("_parentHistory")).toBe(true);
    expect(node.get("_parentHistory").has("root")).toBe(true);
  });

  test("Ytree.create node throws error when called with already existing node key", () => {
    expect(() => {
      const yDoc = new Y.Doc();
      const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
      const yTree = new YTree(yMap);
      yTree.createNode("root", "a", "a_value");
      yTree.createNode("root", "b", "b_value");

      yTree.createNode("a", "c", "c_value");
      yTree.createNode("a", "d", "d_value");

      yTree.createNode("b", "e", "e_value");
      yTree.createNode("b", "f", "f_value");
      yTree.createNode("root", "a", "a_value");
    }).toThrow("[ytree] Node with key: " + "a" + " already exists");
  })

  test('YTree.deleteNodeAndDescendants removes node and all its descendants', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");

    yTree.createNode("a", "c", "c_value");
    yTree.createNode("a", "d", "d_value");

    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");
    yTree.deleteNodeAndDescendants("a");
    expect(checkComputedMap(yTree.computedMap, new Map([["root", null], ["b", "root"], ["e", "b"], ["f", "b"]]))).toEqual(true);

    // Ensure 'a', 'c', and 'd' are not present in Y.Map
    expect(yTree.getYMap().has("a")).toBe(false);
    expect(yTree.getYMap().has("c")).toBe(false);
    expect(yTree.getYMap().has("d")).toBe(false);
  });

  test('YTree.moveChildToParent reassigns child to new parent', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    // Moving 'e' under 'root'
    yTree.moveChildToParent("e", "root");
    expect(checkComputedMap(yTree.computedMap, new Map([["root", null], ["b", "root"], ["f", "b"], ["e", "root"]]))).toEqual(true);

    // Moving 'f' under 'e'
    yTree.moveChildToParent("f", "e");
    expect(checkComputedMap(yTree.computedMap, new Map([["root", null], ["b", "root"], ["e", "root"], ["f", "e"]]))).toEqual(true);
  });

  test('YTree.moveChildToParent throws error for invalid moves', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");
    // Trying to move 'root' under 'e' should throw an error
    expect(() => {
      yTree.moveChildToParent("root", "e");
    }).toThrow("[ytree] Cannot reparent a node to itself or its descendants.");

    // Trying to move a non-existent child
    expect(() => {
      yTree.moveChildToParent("nonexistent", "root");
    }).toThrow("[ytree] Child with key: nonexistent does not exist");

    // Trying to move to a non-existent parent
    expect(() => {
      yTree.moveChildToParent("e", "nonexistent");
    }).toThrow("[ytree] Parent with key: nonexistent does not exist");
  });

  test('YTree.setNodeValueFromKey throws error for non-existent node', () => {
    expect(() => {
      const yDoc = new Y.Doc();
      const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
      const yTree = new YTree(yMap);

      yTree.createNode("root", "b", "b_value");
      yTree.createNode("b", "e", "e_value");
      yTree.createNode("b", "f", "f_value");
      yTree.setNodeValueFromKey("nonexistent", "some_value");
    }).toThrow("[ytree] node with key: nonexistent does not exist");
  });

  test('YTree.setNodeValueFromKey throws error for missing value', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    expect(() => {
      yTree.setNodeValueFromKey("b", null);
    }).toThrow("[ytree] value is required");

    expect(() => {
      yTree.setNodeValueFromKey("b", undefined);
    }).toThrow("[ytree] value is required");

  });

  test('YTree.setNodeValueFromKey updates the value of an existing node', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");
    yTree.setNodeValueFromKey("e", "new_e_value");
    const value = yTree.getNodeValueFromKey("e");
    expect(value).toBe("new_e_value");
  });

  test('YTree.getNodeChildrenFromKey throws error for non-existent node', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");

    expect(() => {
      yTree.getNodeChildrenFromKey("nonexistent");
    }).toThrow("[ytree] node with key: nonexistent does not exist");
  });

  test('YTree.getNodeChildrenFromKey returns correct children', () => {

    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    const childrenOfRoot = yTree.getNodeChildrenFromKey("root");
    expect(childrenOfRoot).toEqual(["b"]);

    const childrenOfE = yTree.getNodeChildrenFromKey("b");
    expect(childrenOfE).toEqual(["e", "f"]);
  });

  test('YTree.getNodeParentFromKey throws error for non-existent node', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    expect(() => {
      yTree.getNodeParentFromKey("nonexistent");
    }).toThrow("[ytree] node with key: nonexistent does not exist");
  });

  test('YTree.getNodeParentFromKey returns correct parent', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    const parentOfB = yTree.getNodeParentFromKey("b");
    expect(parentOfB).toBe("root");

    const parentOfF = yTree.getNodeParentFromKey("f");
    expect(parentOfF).toBe("b");
  });

  test('YTree observes changes and executes callback functions', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    const callback = jest.fn();
    yTree.observe(callback);

    // Perform an operation to trigger the callback
    yTree.createNode("root", "g", "g_value");

    // Callback should have been triggered
    expect(callback).toHaveBeenCalledTimes(1);

    // Unobserve and verify callback is no longer called
    yTree.unobserve(callback);
    yTree.createNode("root", "h", "h_value");
    expect(callback).toHaveBeenCalledTimes(1); // No additional calls
  });

  test('YTree.unobserve logs error when trying to remove a non-existent callback', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    const nonExistentCallback = jest.fn();
    console.error = jest.fn(); // Mock console.error
    yTree.unobserve(nonExistentCallback);

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith("[ytree] tried to remove callback that does not exist");
  });

  test('edgeWithLargestCounter returns correct edge ID', () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    const node = yTree.computedMap.get("b");
    const largestEdge = edgeWithLargestCounter(node);
    expect(largestEdge).toBe("root"); // 'b' was added before 'e' as a child of 'root'
  });

  test('YTree isNodeUnderOtherNode correctly identifies subtree relationships', () => {

    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "b", "b_value");
    yTree.createNode("b", "e", "e_value");
    yTree.createNode("b", "f", "f_value");

    // Moving 'e' under 'root'
    yTree.moveChildToParent("e", "root");

    // Moving 'f' under 'e'
    yTree.moveChildToParent("f", "e");

    const root = yTree.computedMap.get("root");
    const b = yTree.computedMap.get("b");
    const f = yTree.computedMap.get("f");

    expect(yTree.isNodeUnderOtherNode(b, root)).toBe(true); // 'b' is under 'root'
    expect(yTree.isNodeUnderOtherNode(f, b)).toBe(false); // 'f' is not under 'b'
    expect(yTree.isNodeUnderOtherNode(f, root)).toBe(true); // 'f' is under 'root'
  });

  test("YTree computing logic is working as intended", () => {
    const yDocOne = new Y.Doc();
    const yDocTwo = new Y.Doc();

    const yMapOne = yDocOne.getMap("ymap").set("ytree", new Y.Map());
    const yTreeOne = new YTree(yMapOne);

    yTreeOne.createNode("root", "x", "c_value");
    yTreeOne.createNode("root", "y", "d_value");
    yTreeOne.createNode("x", "a", "c_value");
    yTreeOne.createNode("x", "b", "c_value");
    yTreeOne.createNode("y", "c", "c_value");
    yTreeOne.createNode("y", "d", "c_value");

    expect(checkComputedMap(yTreeOne.computedMap, new Map([["root", null], ["x", "root"], ["y", "root"], ["a", "x"], ["b", "x"], ["c", "y"], ["d", "y"]]))).toEqual(true);

    Y.applyUpdate(yDocTwo, Y.encodeStateAsUpdate(yDocOne));

    const yTreeTwo = new YTree(yDocTwo.getMap("ymap").get("ytree"));

    expect(checkComputedMap(yTreeTwo.computedMap, new Map([["root", null], ["x", "root"], ["y", "root"], ["a", "x"], ["b", "x"], ["c", "y"], ["d", "y"]]))).toEqual(true);

    yTreeTwo.moveChildToParent("y", "a");
    yTreeOne.moveChildToParent("a", "y");

    syncTwoYDocs(yDocOne, yDocTwo);

    expect(checkComputedMap(yTreeTwo.computedMap, new Map([["root", null], ["x", "root"], ["y", "root"], ["a", "y"], ["b", "x"], ["c", "y"], ["d", "y"]]))).toEqual(true);
    expect(checkComputedMap(yTreeOne.computedMap, new Map([["root", null], ["x", "root"], ["y", "root"], ["a", "y"], ["b", "x"], ["c", "y"], ["d", "y"]]))).toEqual(true);

    yTreeOne.moveChildToParent("a", "x");
    yTreeTwo.moveChildToParent("a", "x");

    expect(checkComputedMap(yTreeTwo.computedMap, new Map([["root", null], ["x", "root"], ["y", "root"], ["a", "x"], ["b", "x"], ["c", "y"], ["d", "y"]]))).toEqual(true);
    expect(checkComputedMap(yTreeOne.computedMap, new Map([["root", null], ["x", "root"], ["y", "root"], ["a", "x"], ["b", "x"], ["c", "y"], ["d", "y"]]))).toEqual(true);
  });

  test("YTree.sortChildrenByOrder sorts correctly, YTree.setNodeAfter sets node position correctly", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");
    yTree.createNode("root", "c", "c_value");
    yTree.createNode("root", "d", "d_value");
    yTree.createNode("root", "e", "e_value");
    yTree.createNode("root", "f", "f_value");

    yTree.setNodeAfter("a", "c");
    const children = yTree.getNodeChildrenFromKey("root");
    expect(yTree.sortChildrenByOrder(children, "root")).toStrictEqual(['b', 'c', 'a', 'd', 'e', 'f']);
  })

  test("YTree.setNodeBefore sets node position correctly", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");
    yTree.createNode("root", "c", "c_value");
    yTree.createNode("root", "d", "d_value");
    yTree.createNode("root", "e", "e_value");
    yTree.createNode("root", "f", "f_value");

    yTree.setNodeBefore("a", "c");
    const children = yTree.getNodeChildrenFromKey("root");
    expect(yTree.sortChildrenByOrder(children, "root")).toStrictEqual(['b', 'a', 'c', 'd', 'e', 'f']);
  })

  test("YTree.setNodeOrderToStart moves node to the beginning", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");
    yTree.createNode("root", "c", "c_value");

    yTree.setNodeOrderToStart("c");
    const children = yTree.getNodeChildrenFromKey("root");
    expect(yTree.sortChildrenByOrder(children, "root")).toStrictEqual(["c", "a", "b"]);
  });

  test("YTree.setNodeOrderToEnd moves node to the end", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);

    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");
    yTree.createNode("root", "c", "c_value");

    yTree.setNodeOrderToEnd("a");
    const children = yTree.getNodeChildrenFromKey("root");
    expect(yTree.sortChildrenByOrder(children, "root")).toStrictEqual(["b", "c", "a"]);
  });

  test("Ytree sets order of inserted nodes to end of their parent's children array", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    yTree.createNode("root", "a", "a_value");
    yTree.createNode("root", "b", "b_value");
    yTree.createNode("root", "c", "c_value");
    yTree.createNode("root", "d", "d_value");
    yTree.createNode("root", "e", "e_value");
    yTree.createNode("root", "f", "f_value");

    const children = yTree.getNodeChildrenFromKey("root");
    expect(yTree.sortChildrenByOrder(children, "root")).toStrictEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  })

  test("Ytree sets order of moved node to end of destination parent's children array", () => {
    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("ymap").set("ytree", new Y.Map());
    const yTree = new YTree(yMap);
    yTree.createNode("root", "a", "a_value");
    yTree.createNode("a", "b", "b_value");
    yTree.createNode("a", "c", "c_value");
    yTree.createNode("root", "d", "d_value");
    yTree.createNode("d", "e", "e_value");
    yTree.createNode("d", "f", "f_value");

    yTree.moveChildToParent("d", "a");

    const children = yTree.getNodeChildrenFromKey("a");
    expect(yTree.sortChildrenByOrder(children, "a")).toStrictEqual(['b', 'c', 'd']);
  })


  test('performance test', (done) => {
    const yDocOne = new Y.Doc();
    const yDocTwo = new Y.Doc();

    const yMapOne = yDocOne.getMap("ymap").set("ytree", new Y.Map());
    const yTreeOne = new YTree(yMapOne);

    console.timeEnd("node creation time");
    yDocOne.transact(() => {
      for (let j = 0; j < 10; j++) {
        yTreeOne.createNode("root", "" + j, "value");
        for (let k = 0; k < 10; k++) {
          yTreeOne.createNode("" + j, "" + j + "" + k, "value");
          for (let l = 0; l < 10; l++) {
            yTreeOne.createNode("" + j + "" + k, "" + j + "" + k + "" + l, "value");
            // for (let m = 0; m < 2; m++) {
            //   yTreeOne.createNode("" + j + "" + k + "" + l, "" + j + "" + k + "" + l + "" + m, "value");
            // }
          }
        }
      }
    });
    console.timeEnd("node creation time");

    Y.applyUpdate(yDocTwo, Y.encodeStateAsUpdate(yDocOne));

    const yTreeTwo = new YTree(yDocTwo.getMap("ymap").get("ytree"));

    syncTwoYDocs(yDocOne, yDocTwo);

    console.time("node moving time")
    for (let i = 0; i < 500; i++) {
      const parentKey = `${Math.floor(i / 10)}`;
      const childKey = `${Math.floor(i / 10)}${i % 10}`;
      yTreeOne.moveChildToParent(childKey, parentKey);
    }

    for (let i = 0; i < 500; i++) {
      const parentKey = `${Math.floor(i / 10)}`;
      const childKey = `${Math.floor(i / 10)}${i % 10}`;
      yTreeTwo.moveChildToParent(childKey, parentKey);
    }

    // Create a cycle
    yTreeOne.moveChildToParent("0", "1");
    yTreeTwo.moveChildToParent("0", "1");
    console.timeEnd("node moving time")
    syncTwoYDocs(yDocOne, yDocTwo);

    const allDescendants = [];
    yTreeOne.getAllDescendants("root", allDescendants);

    expect(allDescendants.length).toEqual(1 + 10 + 10 * 10 + 10 * 10 * 10);
    done();
  })
});