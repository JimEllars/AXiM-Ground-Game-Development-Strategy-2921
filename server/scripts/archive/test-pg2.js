const q = `SELECT * FROM table WHERE \${['a=1', 'b=2'].join(' AND ')}`;
console.log(q);
