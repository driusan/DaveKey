export function formatUsername(user) {
    if (user.host) {
        return '@' + user.username + '@' + user.host;
    }
    return '@' + user.username;
};

