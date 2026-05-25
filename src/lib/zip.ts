const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;

type ZipEntry = {
    fileName: string;
    data: Buffer;
    modifiedAt?: Date;
};

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index += 1) {
        let current = index;
        for (let bit = 0; bit < 8; bit += 1) {
            current = (current & 1) !== 0
                ? 0xedb88320 ^ (current >>> 1)
                : current >>> 1;
        }
        table[index] = current >>> 0;
    }

    return table;
})();

function getDosDateTime(inputDate: Date) {
    const year = Math.max(1980, inputDate.getFullYear());
    const month = inputDate.getMonth() + 1;
    const day = inputDate.getDate();
    const hours = inputDate.getHours();
    const minutes = inputDate.getMinutes();
    const seconds = Math.floor(inputDate.getSeconds() / 2);

    const dosTime = (hours << 11) | (minutes << 5) | seconds;
    const dosDate = ((year - 1980) << 9) | (month << 5) | day;

    return { dosTime, dosDate };
}

function calculateCrc32(buffer: Buffer) {
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

export function buildZipArchive(entries: ZipEntry[]) {
    const localParts: Buffer[] = [];
    const centralDirectoryParts: Buffer[] = [];
    let currentOffset = 0;

    for (const entry of entries) {
        const fileNameBuffer = Buffer.from(entry.fileName, "utf8");
        const { dosTime, dosDate } = getDosDateTime(entry.modifiedAt || new Date());
        const crc32 = calculateCrc32(entry.data);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, 0);
        localHeader.writeUInt16LE(ZIP_VERSION, 4);
        localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
        localHeader.writeUInt16LE(ZIP_STORE_METHOD, 8);
        localHeader.writeUInt16LE(dosTime, 10);
        localHeader.writeUInt16LE(dosDate, 12);
        localHeader.writeUInt32LE(crc32, 14);
        localHeader.writeUInt32LE(entry.data.length, 18);
        localHeader.writeUInt32LE(entry.data.length, 22);
        localHeader.writeUInt16LE(fileNameBuffer.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, fileNameBuffer, entry.data);

        const centralDirectoryHeader = Buffer.alloc(46);
        centralDirectoryHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_SIGNATURE, 0);
        centralDirectoryHeader.writeUInt16LE(ZIP_VERSION, 4);
        centralDirectoryHeader.writeUInt16LE(ZIP_VERSION, 6);
        centralDirectoryHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
        centralDirectoryHeader.writeUInt16LE(ZIP_STORE_METHOD, 10);
        centralDirectoryHeader.writeUInt16LE(dosTime, 12);
        centralDirectoryHeader.writeUInt16LE(dosDate, 14);
        centralDirectoryHeader.writeUInt32LE(crc32, 16);
        centralDirectoryHeader.writeUInt32LE(entry.data.length, 20);
        centralDirectoryHeader.writeUInt32LE(entry.data.length, 24);
        centralDirectoryHeader.writeUInt16LE(fileNameBuffer.length, 28);
        centralDirectoryHeader.writeUInt16LE(0, 30);
        centralDirectoryHeader.writeUInt16LE(0, 32);
        centralDirectoryHeader.writeUInt16LE(0, 34);
        centralDirectoryHeader.writeUInt16LE(0, 36);
        centralDirectoryHeader.writeUInt32LE(0, 38);
        centralDirectoryHeader.writeUInt32LE(currentOffset, 42);

        centralDirectoryParts.push(centralDirectoryHeader, fileNameBuffer);
        currentOffset += localHeader.length + fileNameBuffer.length + entry.data.length;
    }

    const centralDirectoryBuffer = Buffer.concat(centralDirectoryParts);
    const endOfCentralDirectory = Buffer.alloc(22);
    endOfCentralDirectory.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
    endOfCentralDirectory.writeUInt16LE(0, 4);
    endOfCentralDirectory.writeUInt16LE(0, 6);
    endOfCentralDirectory.writeUInt16LE(entries.length, 8);
    endOfCentralDirectory.writeUInt16LE(entries.length, 10);
    endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12);
    endOfCentralDirectory.writeUInt32LE(currentOffset, 16);
    endOfCentralDirectory.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectoryBuffer, endOfCentralDirectory]);
}
