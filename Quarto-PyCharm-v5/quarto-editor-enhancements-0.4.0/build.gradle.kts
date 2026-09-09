plugins {
    java
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "org.quarto.pycharm"
version = "0.5.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // PyCharm Community still uses the PC artifact in the 2025.1 line.
        // Resolve its multi-OS archive because this release is not exposed by
        // the current installer resolver.
        pycharmCommunity("2025.1.2") {
            useInstaller = false
        }
        bundledPlugin("org.jetbrains.plugins.textmate")
    }
}

java {
    // The requested PyCharm installation bundles JBR/JDK 25.
    // Emit Java 21 bytecode for platform 251 compatibility.
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 21
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "251"
        }
    }
}
