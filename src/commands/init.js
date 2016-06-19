import CommandList from './base';

import SearchCommand from './search';
import AddCommand from './add';
import RemoveCommand from './rm';
import CleanupCommand from './cleanup';
import ImportCommand from './import';


export default new CommandList({
    'search': SearchCommand,
    'add': AddCommand,
    'rm': RemoveCommand,
    'cleanup': CleanupCommand,
    'import': ImportCommand,
});
