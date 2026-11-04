export function canonicalSql(sql, body = false) {
  const tokens = [];
  const re = /--[^\n]*|\/\*[\s\S]*?\*\/|(\$[A-Za-z_0-9]*\$)([\s\S]*?)\1|'(?:''|[^'])*'|"(?:""|[^"])*"|[A-Za-z_][A-Za-z0-9_$]*|[0-9]+|[^\s]/g;
  for (const match of sql.matchAll(re)) {
    const token = match[0];
    if (token.startsWith('--') || token.startsWith('/*')) continue;
    if (match[1]) {
      const proceduralBody = !body && ['as', 'do'].includes(tokens.at(-1));
      tokens.push(proceduralBody ? ['body', canonicalSql(match[2], true)] : ['literal', match[2]]);
      continue;
    }
    let value = /^[A-Za-z_][A-Za-z0-9_$]*$/.test(token) ? token.toLowerCase() : token;
    if (!body && tokens.length >= 2 && tokens.at(-2) === 'set' && tokens.at(-1) === 'search_path' && value === 'to') value = '=';
    if (!body && tokens.length >= 3 && tokens.at(-3) === 'set' && tokens.at(-2) === 'search_path' && tokens.at(-1) === '=' && value === "'public'") value = 'public';
    if (!body && value === ';' && tokens.at(-1) === ';') continue;
    tokens.push(value);
  }
  if (!body) while (tokens.at(-1) === ';') tokens.pop();
  return tokens;
}
