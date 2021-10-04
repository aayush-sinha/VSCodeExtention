export const getIdFromKey = (key) => {
    return key.slice(key.lastIndexOf('-') + 1);
}

export const getLabelFromKey = (key) => {
    return key.slice(0, key.lastIndexOf('-'));
}

 export function list_to_tree(list) {
    var map = {},
      node,
      roots = [],
      i;
  
    for (i = 0; i < list.length; i += 1) {
      map[list[i].id] = i; // initialize the map
      list[i].children = []; // initialize the children
      //   console.log(map)
    }
    console.log(map);
    for (i = 0; i < list.length; i += 1) {
      node = list[i];
      if (node.parent_id !== "0") {
        // if you have dangling branches check that map[node.parentId] exists
        list[map[node.parent_id]].children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

