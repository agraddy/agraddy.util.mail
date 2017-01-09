var mod = {};

mod.mail = {};
mod.mail.fqdn = 'mail.example.com';
mod.mail.send = true;

mod.smtp = {};

mod.smtp.accounts = [];
mod.smtp.accounts.push('accept@example.com');
mod.smtp.accounts.push('reject@example.com');
mod.smtp.accounts.push('never@example.com');

mod.smtp.banner = 'Howdy partner!';

mod.smtp.fqdn = 'mail.example.com';

module.exports = mod;
