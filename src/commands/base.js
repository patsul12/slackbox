import pkgInfo from '../../package.json';


function isSubClass(B, A) {
    return B.prototype instanceof A || B === A;
}

export class CommandError {
    constructor(message) {
        this.message = `${(message || '')}`;
    }

    toString() {
        if (this.message) {
            return this.message;
        }

        return `CommandError: Processing command failed`;
    }
}

export class BaseCommand {
    constructor() {
        this._params = null;
        this._help = null;
    }

    getParams() {
        if (!this._params) {
            this._params = this._loadFromStatics(
                'params',
                'Missing params definition. Add static params to your command class or overwrite getParams'
            );
        }

        return this._params;
    }

    getHelp() {
        if (!this._help) {
            this._help = this._loadFromStatics(
                'help',
                'Missing help definition. Add static help to your command class or overwrite getHelp'
            );
        }

        return this._help;
    }

    handleCommand(params) {
        return 'this command does nothing';
    }

    async runCommand(params) {
        try {
            const ret = await this.handleCommand(params);
            return ret;
        } catch(e) {
            // Rethrow any other error
            throw e;
        }
    }

    _loadFromStatics(propName, message, initial) {
        let res = initial || undefined;
        let target = this.constructor;

        while(target) {
            // Break if not a subclass
            if (!isSubClass(target, BaseCommand)) {
                break;
            }

            // If target has prop defined, lets retrieve it
            if (target[propName] !== undefined) {
                res = target[propName];
                break;
            }

            // Go up in prototype chain
            target = target.prototype;
        }

        if (message && res === undefined) {
            throw new Error(message);
        }

        return res;
    }
}


export default class CommandList {
    constructor(commands) {
        this.commands = {};

        if (commands) {
            Object.keys(commands).forEach((keyName) => {
                this.commands[keyName] = new commands[keyName]();
            });
        }
    }

    async handle(bodyText) {
        const cmdParts = (bodyText || '').split(' ');

        let cmd = cmdParts[0] || '';
        const cmdBody = cmdParts.slice(1).join(' ') || '';

        if (cmd && cmd[0] === '!') {
            cmd = cmd.substring(1);
        }

        if (typeof this.commands[cmd] !== 'undefined') {
            try {
                const res = await this.commands[cmd].runCommand(cmdBody);
                return {
                    message: res,
                };
            } catch(error) {
                if (error instanceof CommandError) {
                    return {
                        commandError: error.toString(),
                    };
                }

                return {
                    error,
                };
            }
        } else {
            return {
                message: this.handleHelp(cmd),
            };
        }
    }

    handleHelp(cmd) {
        const toPrint = [
            cmd && cmd !== 'help' ? `Unknown command \`${cmd}\`\n` : null,
            `*${pkgInfo.name}* v${pkgInfo.version}`,
            '----\n',
            '- `/jukebox !help` Show jukebox command help',
        ];

        Object.keys(this.commands).forEach(key => {
            const cmd = this.commands[key];

            toPrint.push(`- \`/jukebox !${key} ${cmd.getParams()}\` ${cmd.getHelp()}`)
        });

        // Filter out bad lines and push join them with newLine
        return toPrint.filter(x => x).join('\n');
    }
}
