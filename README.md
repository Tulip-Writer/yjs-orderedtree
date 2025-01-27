# yjs-orderedtree

An ordered tree class for yjs. Lets you use a Y.Map like an ordered tree with insert, delete, and move operations. The children are ordered and the position of a child amongst its sibling can be manipulated. yjs-orderedtree uses logic and code https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/ and https://madebyevan.com/algos/crdt-fractional-indexing/ to facilitate this.


# How it works

The YTree class manages the logic for the tree and ordering operations. It is associated with a Y.Map that it uses to hold information that must be synchronized with peers/clients, that information being the parent history of every node.

It holds a virtual map that is recalculated everytime the tree changes. That virtual map holds calculated values like a node's parent and children. YTree functions usually interact with this virtual map when fetching information about nodes, and they interact with the Y.Map when adding or updating nodes. 

A Y.Map associated with a YTree must have a certain structure. It doesn't absolutely check for this structure, it only checks that the mandatory root node exists. 

# Installation

TODO

# Usage

Create or fetch a valid Y.Map and pass it to the YTree constructor to use the Y.Map as an ordered tree.

A Y.Map is valid when:

*   It is empty. (Creating a new tree)
*   When it has already been initialized. (Loading an existing tree)

If an initiated Y.Map is passed to the constructor, then the tree structure is setup and the virtual map is computed.

If the constructor is passed an empty Y.Map then it will initiate it by creating a new root node. That would overwrite an existing YTree, if that Y.Map was being used to hold information for a YTree. 

So be aware of when you are creating or loading a YTree. When loading a YTree, check if the Y.Map has been initiated with CheckForYtree().

## Creating a tree

Create an empty Y.Map bounded to a yjs document

```javascript
// create Y.Map
const yMap = new Y.Map();
// bound it to a yjs document
ydoc.getMap("ytree", yMap);
// use YTree constructor to get a YTree object
const yTree = new YTree(yMap);
```

or

```javascript
// create Y.Map
const yMap = ydoc.getMap("ytree", new Y.Map());
// use YTree constructor to get a YTree object
const yTree = new YTree(yMap);
```

## Loading a tree

Take the Y.Map and make sure that is initiated by using CheckForYTree

```javascript
// fetch Y.Map
const yMap = ydoc.getMap("ytree);
if (!checkForYTree(yMap)) {
    throw new Error("Y.Map is not initiated");
}
const yTree = new YTree(yMap);
```

## Using the tree

Take a look at the API reference :)

# API Reference

## checkForYTree

`function checkForYTree(Y.Map):boolean`

Checks if the Ymap has been initialized for YTree operations. It specifically checks if root node exists. This should be done any time you want to load a ytree and not create it.

## YTree

`const yTree = new YTree(yMap);`

YTree uses https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/ and https://madebyevan.com/algos/crdt-fractional-indexing/

It uses them to implement an ordered tree data structure, on top of YJS https://github.com/yjs/yjs, that maintains synchronization and consistency across multiple clients.

### `constructor(Y.Map): YTree`

Constructor is required to be called with a Y.Map instance that is bound to a Y.Doc.

The YMap is required to be empty or initialized.  If given an empty (uninitialized) YMap then it initializes the YMap for YTree operations by creating a root node. If you don't want to accidentally create a Ytree then use checkForYTree beforehand to ensure that a YTree has been initialized.

### `createNode`

### `deleteNodeAndDescendants`

### `moveChildToParent`

### `setNodeValueFromKey`

### `getNodeValueFromKey`

### `getNodeChildrenFromKey`

### `getNodeParentFromKey`

### `getAllDescendants`

### `setNodeOrderToStart`

### `setNodeOrderToEnd`

### `setNodeAfter`

### `setNodeBefore`

### `sortChildrenByOrder`
