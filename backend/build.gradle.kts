plugins {
    kotlin("jvm") version "1.9.24"
    id("io.ktor.plugin") version "2.3.12"
}

group = "com.invader"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.ktor:ktor-server-core-jvm:2.3.12")
    implementation("io.ktor:ktor-server-netty-jvm:2.3.12")
    implementation("io.ktor:ktor-server-content-negotiation-jvm:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm:2.3.12")
    implementation("io.ktor:ktor-server-cors-jvm:2.3.12")
    implementation("ch.qos.logback:logback-classic:1.5.6")
    testImplementation("io.ktor:ktor-server-test-host-jvm:2.3.12")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit:1.9.24")
}

application {
    mainClass.set("com.invader.ApplicationKt")
}

kotlin {
    jvmToolchain(17)
}
