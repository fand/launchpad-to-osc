#!/usr/bin/env node
const meow = require('meow');
const Pad = require('..');

const cli = meow(`
	Usage
	  $ launchpad-mini-osc

	Options
	  --port, -p  Include a rainbow

	Examples
	  $ launchpad-mini-osc --port 3333

`, {
	flags: {
		port: {
			type: 'number',
			alias: 'p'
		}
	}
});

const port = cli.flags.port || 3333;

const p = new Pad(port);
p.start()
	.then(() => {
		process.on('exit', () => {
		  p.close();
		  process.exit();
		});
	})
	.catch((e) => {
		console.error(e);
		process.exit(-1);
	});
