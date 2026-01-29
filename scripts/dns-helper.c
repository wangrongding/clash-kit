#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>

int main(int argc, char *argv[]) {
    if (setuid(0) != 0) {
        perror("setuid");
        return 1;
    }

    if (argc < 2) {
        fprintf(stderr, "Usage: %s <service> <dns1> [dns2] ...\n", argv[0]);
        return 1;
    }

    char *path = "/usr/sbin/networksetup";
    char **new_argv = malloc((argc + 2) * sizeof(char*));
    if (!new_argv) {
        perror("malloc");
        return 1;
    }

    new_argv[0] = "networksetup";
    new_argv[1] = "-setdnsservers";
    
    int i;
    for (i = 1; i < argc; i++) {
        new_argv[i+1] = argv[i];
    }
    new_argv[i+1] = NULL;

    execv(path, new_argv);

    perror("execv failed");
    return 1;
}
