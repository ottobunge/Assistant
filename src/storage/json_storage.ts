import fs from 'fs';


export default class JSONStorage<SerializedType> {
  private readonly filename: string;
  constructor(filename: string) {
    this.filename = filename;
  }
  public writeToFile(data: SerializedType) {
    fs.writeFileSync(this.filename, JSON.stringify(data, null, 2));
  }

  public readFromFile(): SerializedType {
    const file = fs.readFileSync(this.filename);
    return JSON.parse(file.toString()) as SerializedType;
  }

  public createFileIfNotExists() {
    if (!fs.existsSync(this.filename)) {
      fs.writeFileSync(this.filename, JSON.stringify({} as SerializedType, null, 2));
    }
  }
}
