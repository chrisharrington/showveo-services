export default class Config {
    static enabled = {
        api: true,
        converter: true,
        indexer: true,
        metadata: true,
        subtitler: false
    };

    static metadataApiKey: string = 'c26c67ed161834067f4d91430df1024e';
    static metadataApiUrl: string = 'https://api.themoviedb.org/3/';
    static databaseConnectionString: string = 'mongodb://192.168.1.101:27017';
    static queueConnectionString: string = 'amqp://api:hqoy3em23b7xive7nfjxi3nyop47e5rn@showveo-queue:5672';
    static subtitlesUserAgent: string = 'Showveo';

    static serverPort: number = 12000;
    static serverApiKey: string = '5c3fdb3a2e444778b127b50b63fdd30f';

    static movieLibraries: string[] = ['/media/movies', '/media/kids-movies'];
    static tvLibraries: string[] = ['/media/tv', '/media/kids-tv'];

    static imageDomain: string = 'https://static.showveo.com/images/';
    static imagePath: string = '/data/images/';

    static playMovieUrl: string = 'https://api.showveo.com/data/movies/play/{year}/{name}';

    static streamDelay: number = 1000;
}