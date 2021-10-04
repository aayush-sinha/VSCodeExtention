export const getIdFromKey = (key) => {
    return key.slice(key.lastIndexOf('-') + 1);
}

export const getLabelFromKey = (key) => {
    return key.slice(0, key.lastIndexOf('-'));
}

